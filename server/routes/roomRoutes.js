const express = require('express');
const multer = require('multer');
const Room = require('../models/Room');
const MergedContext = require('../models/MergedContext');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const { generateQuizContent } = require('../services/aiEngine');
const { requireAuth } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function chunkText(text, chunkSize = 600, overlap = 100) {
  const chunks = [];
  let i = 0;
  while (i < text.length) { chunks.push(text.slice(i, i + chunkSize)); i += chunkSize - overlap; }
  return chunks;
}

async function fetchWikipediaSummary(topic) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'BrainStormArena/1.0' } });
    if (response.ok) {
      const data = await response.json();
      if (data.extract) return data.extract;
    }
  } catch (error) { logger.error('Failed to fetch Wikipedia summary:', error); }
  return null;
}

function retrieveRelevantChunks(chunks, topic, topK = 8) {
  const normalizedTopic = topic.toLowerCase().trim();
  const keywords = normalizedTopic.split(/\s+/).filter(word => word.length > 2);
  const scoredChunks = chunks.map(chunk => {
    let score = 0;
    const chunkLower = chunk.toLowerCase();
    if (chunkLower.includes(normalizedTopic)) score += 200;
    for (const keyword of keywords) {
      const regex = new RegExp(keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      const matches = chunkLower.match(regex);
      if (matches) score += matches.length * keyword.length * 8;
    }
    return { text: chunk, score };
  });
  const relevant = scoredChunks.filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, topK);
  if (relevant.length === 0) return scoredChunks.sort((a, b) => b.score - a.score).slice(0, 3);
  return relevant;
}

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, type, settings } = req.body;
    const hostId = req.user.id;
    if (!name) return res.status(400).json({ error: 'Room name is required' });
    function generateCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
    let code = generateCode();
    while (await Room.exists({ code })) { code = generateCode(); }
    const room = await Room.create({ code, name, hostId, type: type || 'Public', settings: { maxPlayers: settings?.maxPlayers || 10, difficulty: settings?.difficulty || 'medium', questionCount: settings?.questionCount || 5 }, participants: [{ userId: hostId, role: 'host', joinedAt: new Date() }] });
    res.status(201).json({ room });
  } catch (error) { next(error); }
});

router.get('/:code', requireAuth, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() }).populate('hostId', 'username avatarUrl').populate('participants.userId', 'username avatarUrl');
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.status(200).json({ room });
  } catch (error) { next(error); }
});

router.post('/:code/upload', upload.array('files'), async (req, res, next) => {
  try {
    const { code } = req.params;
    const { topicName } = req.body;
    const files = req.files;
    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    let fullText = '';
    for (const file of files) { fullText += `\n\n[File: ${file.originalname}]\n` + file.buffer.toString('utf-8').slice(0, 5000); }
    const chunks = chunkText(fullText);
    let selectedChunksText = '';
    let wikipediaContext = '';
    if (topicName && topicName.trim()) {
      const relevant = retrieveRelevantChunks(chunks, topicName);
      selectedChunksText = relevant.map(r => r.text).join('\n\n');
      if (req.body.searchEnrichment === 'true' || req.body.searchEnrichment === true) {
        logger.info(`Fetching Wikipedia enrichment for topic: ${topicName}`);
        const wikiExtract = await fetchWikipediaSummary(topicName.trim());
        if (wikiExtract) {
          wikipediaContext = wikiExtract;
          selectedChunksText = `[External Source: Wikipedia Summary on ${topicName}]\n${wikiExtract}\n\n[Uploaded Material Context]\n${selectedChunksText}`;
        }
      }
    } else {
      selectedChunksText = chunks.slice(0, 5).join('\n\n');
    }
    await MergedContext.deleteOne({ roomId: room._id });
    const mergedContext = await MergedContext.create({ roomId: room._id, content: selectedChunksText, status: 'Completed', tokenCount: selectedChunksText.split(/\s+/).length, topicName: topicName?.trim() || '' });
    room.status = 'Generating';
    await room.save();
    res.status(200).json({ message: 'Materials refined', mergedContextId: mergedContext._id, retrievedPreview: selectedChunksText.slice(0, 1000), wikipediaFetched: !!wikipediaContext });
  } catch (error) { next(error); }
});

router.post('/:code/generate', async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const mergedContext = await MergedContext.findOne({ roomId: room._id });
    if (!mergedContext) return res.status(400).json({ error: 'No context found' });
    const payload = await generateQuizContent(mergedContext.content, room.settings?.difficulty || 'medium', room.settings?.questionCount || 5, mergedContext.topicName || '');
    await Quiz.deleteMany({ roomId: room._id });
    const quiz = await Quiz.create({ roomId: room._id, contextId: mergedContext._id, title: `${room.name} Quiz`, difficulty: room.settings?.difficulty || 'medium', status: 'Ready', timerMode: payload.timerConfig.mode, timerConfig: payload.timerConfig });
    for (let i = 0; i < payload.questions.length; i++) {
      const q = payload.questions[i];
      let timeLimit = 15;
      if (payload.timerConfig.mode === 'per_question_dynamic' && payload.timerConfig.perQuestionTimes) timeLimit = payload.timerConfig.perQuestionTimes[i] ?? 20;
      else if (payload.timerConfig.mode === 'per_question_fixed') timeLimit = payload.timerConfig.perQuestionSeconds ?? 15;
      else if (payload.timerConfig.mode === 'global_countdown') timeLimit = 0;
      await Question.create({ quizId: quiz._id, type: q.type || 'MCQ', content: q.content, options: q.options, correctAnswerId: q.correctAnswerId, timeLimit, points: 100 });
    }
    room.status = 'Playing';
    await room.save();
    res.status(200).json({ message: 'Quiz generated successfully', quizId: quiz._id, timerConfig: payload.timerConfig });
  } catch (error) { next(error); }
});

router.get('/:code/quiz', async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const quiz = await Quiz.findOne({ roomId: room._id });
    if (!quiz) return res.status(404).json({ error: 'No quiz generated for this room yet' });
    const questions = await Question.find({ quizId: quiz._id });
    res.status(200).json({ quiz, questions, timerConfig: quiz.timerConfig || { mode: 'per_question_fixed', perQuestionSeconds: 15 } });
  } catch (error) { next(error); }
});

module.exports = router;
