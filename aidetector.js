// ===== ADVANCED AI DETECTOR - Professional Grade =====
// Inspired by GPTZero, ZeroGPT, Quillbot AI Detection

// API Configuration
const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const OPENROUTER_URL = "https://asia-southeast1-chipi-d90e8.cloudfunctions.net/openrouter";

// ===== COMPREHENSIVE AI INDICATORS DATABASE =====
const AI_INDICATORS = {
    // ChatGPT/Claude signature phrases
    aiSignatures: [
        'as an ai', 'as an artificial intelligence', 'i cannot', 'i\'m unable to',
        'i don\'t have personal', 'i don\'t have the ability', 'my knowledge cutoff',
        'i was trained', 'my training data', 'language model', 'large language model',
        'i\'m here to help', 'i\'m happy to help', 'i\'d be happy to', 'feel free to ask',
        'let me know if', 'hope this helps', 'is there anything else', 'i can assist',
        'delve into', 'dive into', 'explore the', 'unpack this', 'break this down'
    ],
    
    // Overly formal academic phrases
    formalAcademic: [
        'it is important to note', 'it should be noted that', 'it is worth mentioning',
        'it is crucial to understand', 'it is imperative that', 'it is essential to',
        'it bears mentioning', 'one must consider', 'we must acknowledge',
        'this highlights the importance', 'this underscores the need', 'this demonstrates',
        'in light of', 'in the context of', 'with regard to', 'pertaining to',
        'in terms of', 'on the basis of', 'for the purpose of', 'in order to',
        'due to the fact that', 'owing to the fact', 'by virtue of', 'in accordance with'
    ],
    
    // Transitional phrases overused by AI
    transitions: [
        'furthermore', 'moreover', 'additionally', 'consequently', 'subsequently',
        'nevertheless', 'nonetheless', 'conversely', 'alternatively', 'correspondingly',
        'in addition', 'in contrast', 'on the contrary', 'on the other hand',
        'by the same token', 'in a similar vein', 'along these lines', 'to that end',
        'with that said', 'that being said', 'having said that', 'all things considered',
        'taking everything into account', 'when all is said and done', 'at the end of the day',
        'first and foremost', 'last but not least', 'above all', 'in essence',
        'to summarize', 'to sum up', 'in summary', 'in conclusion', 'to conclude',
        'all in all', 'overall', 'ultimately', 'finally'
    ],
    
    // Hedging language typical of AI
    hedging: [
        'may', 'might', 'could', 'would', 'should', 'possibly', 'potentially',
        'perhaps', 'likely', 'unlikely', 'presumably', 'apparently', 'seemingly',
        'arguably', 'conceivably', 'supposedly', 'generally', 'typically',
        'tends to', 'appears to', 'seems to', 'is known to', 'is believed to',
        'is thought to', 'is considered to', 'is said to', 'is reported to',
        'one might argue', 'it could be argued', 'some may say', 'some believe',
        'research suggests', 'studies indicate', 'evidence shows', 'data suggests'
    ],
    
    // Generic filler phrases
    genericFillers: [
        'a wide range of', 'a variety of', 'a number of', 'a plethora of',
        'an array of', 'a myriad of', 'a multitude of', 'countless',
        'numerous', 'various', 'diverse', 'manifold', 'innumerable',
        'plays a crucial role', 'plays a vital role', 'plays an important role',
        'plays a significant role', 'plays a key role', 'plays a pivotal role',
        'serves as a', 'acts as a', 'functions as a', 'operates as a',
        'in today\'s world', 'in modern society', 'in contemporary times',
        'in this day and age', 'in the current landscape', 'in the modern era',
        'the importance of', 'the significance of', 'the relevance of',
        'the impact of', 'the influence of', 'the role of', 'the nature of'
    ],
    
    // Explanatory patterns
    explanatory: [
        'this means that', 'what this means is', 'in other words', 'put simply',
        'to put it simply', 'simply put', 'to clarify', 'to elaborate',
        'more specifically', 'to be more specific', 'in particular', 'particularly',
        'for instance', 'for example', 'such as', 'including', 'namely',
        'that is to say', 'i.e.', 'e.g.', 'viz.', 'specifically',
        'let me explain', 'allow me to', 'consider the following', 'take for example'
    ],
    
    // Structured list introductions
    listIntros: [
        'here are', 'below are', 'the following', 'these include',
        'there are several', 'there are many', 'there are numerous',
        'key points include', 'main points are', 'important factors include',
        'primary considerations', 'essential elements', 'crucial aspects',
        'first,', 'second,', 'third,', 'fourth,', 'fifth,',
        'firstly,', 'secondly,', 'thirdly,', 'fourthly,', 'fifthly,',
        '1.', '2.', '3.', '4.', '5.',
        'step 1', 'step 2', 'step 3', 'step 4', 'step 5'
    ],
    
    // Conclusion phrases
    conclusions: [
        'in conclusion', 'to conclude', 'in summary', 'to summarize',
        'summing up', 'wrapping up', 'to wrap up', 'in closing',
        'final thoughts', 'concluding remarks', 'closing thoughts',
        'the bottom line', 'the key takeaway', 'the main point',
        'what we can learn', 'what this tells us', 'what we see here'
    ],
    
    // Overly balanced/diplomatic phrases
    diplomatic: [
        'on one hand', 'on the other hand', 'while it is true that',
        'although', 'even though', 'despite', 'in spite of',
        'both sides', 'pros and cons', 'advantages and disadvantages',
        'benefits and drawbacks', 'strengths and weaknesses',
        'it\'s worth noting', 'it\'s important to remember',
        'we should consider', 'we must take into account'
    ],
    
    // Buzzwords and corporate speak
    buzzwords: [
        'leverage', 'synergy', 'optimize', 'streamline', 'maximize',
        'facilitate', 'implement', 'utilize', 'prioritize', 'incentivize',
        'robust', 'scalable', 'sustainable', 'innovative', 'cutting-edge',
        'state-of-the-art', 'best practices', 'paradigm shift', 'holistic',
        'comprehensive', 'multifaceted', 'nuanced', 'dynamic', 'proactive',
        'actionable', 'impactful', 'transformative', 'game-changing'
    ]
};

// Common word frequencies for entropy calculation
const COMMON_WORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'
]);

document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analysisSummary = document.getElementById('analysisSummary');

    analyzeBtn.addEventListener('click', async () => {
        const text = inputText.value.trim();
        if (!text) {
            analysisSummary.style.display = 'none';
            outputText.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Enter text to analyze</p>';
            return;
        }

        if (text.split(/\s+/).length < 20) {
            analysisSummary.innerHTML = `
                <div class="analysis-result">
                    <div class="result-header">
                        <h3>⚠️ Insufficient Text</h3>
                        <p class="result-subtitle">Please provide at least 20 words for accurate analysis</p>
                    </div>
                </div>
            `;
            analysisSummary.style.display = 'block';
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
        analysisSummary.style.display = 'none';
        outputText.innerHTML = `
            <div class="loading-analysis">
                <div class="loading-spinner"></div>
                <p>Running advanced AI detection analysis...</p>
                <p class="loading-sub">Analyzing perplexity, burstiness, and linguistic patterns</p>
            </div>
        `;

        try {
            const results = await runAdvancedAnalysis(text);
            renderAdvancedResults(results);
        } catch (error) {
            console.error('Analysis error:', error);
            outputText.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">Analysis failed. Please try again.</p>';
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Analyze';
        }
    });

    // ===== ADVANCED ANALYSIS ENGINE =====
    async function runAdvancedAnalysis(text) {
        // Run all analysis methods in parallel
        const [
            localMetrics,
            sentenceAnalysis,
            aiApiAnalysis
        ] = await Promise.all([
            computeLocalMetrics(text),
            analyzeSentences(text),
            analyzeWithAI(text).catch(err => {
                console.warn('AI analysis failed:', err);
                return null;
            })
        ]);

        // Combine results
        return combineAnalysisResults(text, localMetrics, sentenceAnalysis, aiApiAnalysis);
    }

    // ===== LOCAL METRICS COMPUTATION =====
    function computeLocalMetrics(text) {
        const sentences = splitIntoSentences(text);
        const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;

        // 1. PERPLEXITY SIMULATION (word predictability)
        const perplexity = calculatePerplexity(words);

        // 2. BURSTINESS (variation in sentence complexity)
        const burstiness = calculateBurstiness(sentences);

        // 3. ENTROPY (information density)
        const entropy = calculateEntropy(words);

        // 4. AI PHRASE DETECTION
        const phraseAnalysis = detectAIPhrases(text);

        // 5. SENTENCE STRUCTURE UNIFORMITY
        const structureUniformity = calculateStructureUniformity(sentences);

        // 6. VOCABULARY RICHNESS
        const vocabRichness = calculateVocabRichness(words);

        // 7. READABILITY CONSISTENCY
        const readabilityConsistency = calculateReadabilityConsistency(sentences);

        // 8. PUNCTUATION PATTERNS
        const punctuationScore = analyzePunctuation(text);

        // 9. PARAGRAPH STRUCTURE
        const paragraphScore = analyzeParagraphStructure(text);

        return {
            perplexity,
            burstiness,
            entropy,
            phraseAnalysis,
            structureUniformity,
            vocabRichness,
            readabilityConsistency,
            punctuationScore,
            paragraphScore,
            wordCount,
            sentenceCount: sentences.length
        };
    }

    // ===== PERPLEXITY CALCULATION =====
    // Lower perplexity = more predictable = more likely AI
    function calculatePerplexity(words) {
        if (words.length < 10) return 50;

        let predictabilityScore = 0;
        const bigramFreq = {};
        const trigramFreq = {};

        // Build n-gram frequencies
        for (let i = 0; i < words.length - 1; i++) {
            const bigram = `${words[i]} ${words[i + 1]}`;
            bigramFreq[bigram] = (bigramFreq[bigram] || 0) + 1;
        }

        for (let i = 0; i < words.length - 2; i++) {
            const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            trigramFreq[trigram] = (trigramFreq[trigram] || 0) + 1;
        }

        // Calculate predictability based on common word usage
        let commonWordCount = 0;
        words.forEach(word => {
            if (COMMON_WORDS.has(word.toLowerCase().replace(/[^a-z]/g, ''))) {
                commonWordCount++;
            }
        });

        // High common word ratio + repeated patterns = low perplexity (AI-like)
        const commonRatio = commonWordCount / words.length;
        const repeatedBigrams = Object.values(bigramFreq).filter(c => c > 1).length;
        const repeatedTrigrams = Object.values(trigramFreq).filter(c => c > 1).length;

        // Perplexity score (0-100, lower = more AI-like)
        predictabilityScore = (commonRatio * 40) + 
                              (repeatedBigrams / words.length * 200) + 
                              (repeatedTrigrams / words.length * 300);

        return Math.min(Math.max(100 - predictabilityScore, 0), 100);
    }

    // ===== BURSTINESS CALCULATION =====
    // Human writing has "bursts" of complexity, AI is more uniform
    function calculateBurstiness(sentences) {
        if (sentences.length < 3) return 50;

        const complexities = sentences.map(s => {
            const words = s.split(/\s+/).length;
            const avgWordLen = s.replace(/\s/g, '').length / Math.max(words, 1);
            const commas = (s.match(/,/g) || []).length;
            const semicolons = (s.match(/;/g) || []).length;
            
            return words * 0.5 + avgWordLen * 2 + commas * 3 + semicolons * 5;
        });

        const mean = complexities.reduce((a, b) => a + b, 0) / complexities.length;
        const variance = complexities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / complexities.length;
        const stdDev = Math.sqrt(variance);
        const coeffOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;

        // Higher coefficient of variation = more burstiness = more human-like
        // Score: 0-100, higher = more human-like
        return Math.min(coeffOfVariation * 2, 100);
    }

    // ===== ENTROPY CALCULATION =====
    function calculateEntropy(words) {
        if (words.length < 10) return 50;

        const freq = {};
        words.forEach(w => {
            const clean = w.toLowerCase().replace(/[^a-z]/g, '');
            if (clean) freq[clean] = (freq[clean] || 0) + 1;
        });

        const total = Object.values(freq).reduce((a, b) => a + b, 0);
        let entropy = 0;

        Object.values(freq).forEach(count => {
            const p = count / total;
            if (p > 0) entropy -= p * Math.log2(p);
        });

        // Normalize to 0-100 scale
        // Typical entropy for English text is 4-5 bits per word
        // Higher entropy = more varied vocabulary = more human-like
        return Math.min((entropy / 6) * 100, 100);
    }

    // ===== AI PHRASE DETECTION =====
    function detectAIPhrases(text) {
        const lowerText = text.toLowerCase();
        const detectedPhrases = [];
        let totalScore = 0;
        const categoryScores = {};

        Object.entries(AI_INDICATORS).forEach(([category, phrases]) => {
            let categoryScore = 0;
            phrases.forEach(phrase => {
                const regex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi');
                const matches = text.match(regex);
                if (matches) {
                    categoryScore += matches.length;
                    detectedPhrases.push({
                        phrase,
                        category,
                        count: matches.length
                    });
                }
            });
            if (categoryScore > 0) {
                categoryScores[category] = categoryScore;
                totalScore += categoryScore;
            }
        });

        return {
            detectedPhrases,
            totalScore,
            categoryScores,
            // Normalize to 0-100 (more phrases = higher AI probability)
            normalizedScore: Math.min((totalScore / (text.split(/\s+/).length / 10)) * 100, 100)
        };
    }

    // ===== SENTENCE STRUCTURE UNIFORMITY =====
    function calculateStructureUniformity(sentences) {
        if (sentences.length < 3) return 50;

        const lengths = sentences.map(s => s.split(/\s+/).length);
        const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
        const stdDev = Math.sqrt(variance);

        // Lower standard deviation = more uniform = more AI-like
        // Return inverse score (higher = more AI-like)
        const uniformityScore = Math.max(100 - (stdDev * 5), 0);
        return uniformityScore;
    }

    // ===== VOCABULARY RICHNESS =====
    function calculateVocabRichness(words) {
        if (words.length < 10) return 50;

        const cleanWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(w => w.length > 2);
        const uniqueWords = new Set(cleanWords);
        
        // Type-Token Ratio
        const ttr = uniqueWords.size / cleanWords.length;
        
        // Hapax Legomena (words appearing only once)
        const freq = {};
        cleanWords.forEach(w => freq[w] = (freq[w] || 0) + 1);
        const hapax = Object.values(freq).filter(c => c === 1).length;
        const hapaxRatio = hapax / uniqueWords.size;

        // Higher TTR and hapax ratio = richer vocabulary = more human-like
        return Math.min((ttr * 50) + (hapaxRatio * 50), 100);
    }

    // ===== READABILITY CONSISTENCY =====
    function calculateReadabilityConsistency(sentences) {
        if (sentences.length < 3) return 50;

        const readabilityScores = sentences.map(s => {
            const words = s.split(/\s+/).length;
            const syllables = countSyllables(s);
            // Simple Flesch-like score per sentence
            return 206.835 - 1.015 * words - 84.6 * (syllables / Math.max(words, 1));
        });

        const mean = readabilityScores.reduce((a, b) => a + b, 0) / readabilityScores.length;
        const variance = readabilityScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / readabilityScores.length;
        
        // Lower variance = more consistent readability = more AI-like
        return Math.min(Math.sqrt(variance) * 2, 100);
    }

    // ===== PUNCTUATION ANALYSIS =====
    function analyzePunctuation(text) {
        const sentences = splitIntoSentences(text);
        
        // AI tends to use consistent punctuation patterns
        const endPunctuation = sentences.map(s => {
            if (s.endsWith('!')) return 'exclaim';
            if (s.endsWith('?')) return 'question';
            return 'period';
        });

        // Count variety in punctuation
        const unique = new Set(endPunctuation);
        const variety = unique.size / 3; // Max 3 types

        // Check for parentheses, dashes, colons usage
        const hasParens = (text.match(/\([^)]+\)/g) || []).length;
        const hasDashes = (text.match(/—|--/g) || []).length;
        const hasColons = (text.match(/:/g) || []).length;

        // More punctuation variety = more human-like
        const complexityScore = (variety * 30) + (hasParens * 5) + (hasDashes * 5) + (hasColons * 3);
        return Math.min(complexityScore, 100);
    }

    // ===== PARAGRAPH STRUCTURE ANALYSIS =====
    function analyzeParagraphStructure(text) {
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
        
        if (paragraphs.length < 2) return 50;

        // AI tends to create evenly-sized paragraphs
        const lengths = paragraphs.map(p => p.split(/\s+/).length);
        const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;

        // Higher variance = less uniform = more human-like
        return Math.min(Math.sqrt(variance) * 3, 100);
    }

    // ===== SENTENCE-BY-SENTENCE ANALYSIS =====
    async function analyzeSentences(text) {
        const sentences = splitIntoSentences(text);
        
        return sentences.map((sentence, index) => {
            const words = sentence.split(/\s+/).filter(w => w.length > 0);
            
            // Calculate AI probability for each sentence
            let aiScore = 0;

            // Check for AI phrases in this sentence
            const lowerSentence = sentence.toLowerCase();
            Object.values(AI_INDICATORS).flat().forEach(phrase => {
                if (lowerSentence.includes(phrase.toLowerCase())) {
                    aiScore += 15;
                }
            });

            // Sentence length analysis (AI prefers medium-length sentences)
            if (words.length >= 15 && words.length <= 25) {
                aiScore += 10; // "Perfect" AI length
            }

            // Check for overly formal structure
            if (/^(however|furthermore|moreover|additionally|consequently)/i.test(sentence.trim())) {
                aiScore += 20;
            }

            // Check for list-like structure
            if (/^(first|second|third|1\.|2\.|3\.|\d+\))/i.test(sentence.trim())) {
                aiScore += 15;
            }

            // Check for hedging at start
            if (/^(it is|there are|this is|one can|we can)/i.test(sentence.trim())) {
                aiScore += 10;
            }

            // Normalize to 0-100
            const normalizedScore = Math.min(aiScore, 100);

            return {
                text: sentence,
                index,
                wordCount: words.length,
                aiProbability: normalizedScore,
                classification: normalizedScore >= 70 ? 'ai' : normalizedScore >= 40 ? 'mixed' : 'human'
            };
        });
    }

    // ===== AI API ANALYSIS =====
    async function analyzeWithAI(text) {
        const systemPrompt = `You are an advanced AI content detection system modeled after GPTZero and ZeroGPT. 
Analyze text for AI-generation markers with high accuracy.

ANALYSIS CRITERIA:
1. Perplexity: How predictable is the word choice? (AI = low perplexity)
2. Burstiness: How varied is sentence complexity? (AI = low burstiness)
3. Vocabulary patterns: Overuse of transitions, hedging, formal phrases
4. Structural uniformity: AI text has consistent paragraph/sentence lengths
5. Personality markers: Human writing has distinct voice, opinions, errors
6. Topic coherence: AI tends to be generically comprehensive

RETURN ONLY valid JSON:
{
    "overallAiProbability": number (0-100),
    "humanProbability": number (0-100),
    "confidence": number (0-100),
    "perplexityScore": "low" | "medium" | "high",
    "burstinessScore": "low" | "medium" | "high",
    "detectedPatterns": ["pattern1", "pattern2"],
    "suspiciousSentences": [0, 2, 5],
    "assessment": "detailed assessment",
    "verdict": "Human" | "Mixed" | "AI Generated"
}`;

        const userPrompt = `Analyze this text for AI generation (be thorough and accurate):

"""
${text.substring(0, 3000)}
"""

${text.length > 3000 ? `(Truncated from ${text.length} chars)` : ''}

Provide detailed AI detection analysis.`;

        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';

        try {
            return JSON.parse(content);
        } catch {
            const match = content.match(/\{[\s\S]*\}/);
            return match ? JSON.parse(match[0]) : null;
        }
    }

    // ===== COMBINE ANALYSIS RESULTS =====
    function combineAnalysisResults(text, localMetrics, sentenceAnalysis, aiApiAnalysis) {
        // Calculate weighted AI probability from local metrics
        let localAiScore = 0;
        
        // Perplexity: low perplexity = AI-like (invert score)
        localAiScore += (100 - localMetrics.perplexity) * 0.15;
        
        // Burstiness: low burstiness = AI-like (invert score)
        localAiScore += (100 - localMetrics.burstiness) * 0.15;
        
        // Structure uniformity: high uniformity = AI-like
        localAiScore += localMetrics.structureUniformity * 0.15;
        
        // Vocab richness: low richness = AI-like (invert score)
        localAiScore += (100 - localMetrics.vocabRichness) * 0.10;
        
        // AI phrase detection
        localAiScore += localMetrics.phraseAnalysis.normalizedScore * 0.25;
        
        // Readability consistency: low variance = AI-like (invert score)
        localAiScore += (100 - localMetrics.readabilityConsistency) * 0.10;
        
        // Punctuation: less variety = AI-like (invert score)
        localAiScore += (100 - localMetrics.punctuationScore) * 0.05;
        
        // Paragraph structure: more uniform = AI-like (invert score)
        localAiScore += (100 - localMetrics.paragraphScore) * 0.05;

        // Get AI API score if available
        const apiAiScore = aiApiAnalysis?.overallAiProbability || null;

        // Combine scores (prefer API when available)
        let finalAiScore;
        if (apiAiScore !== null) {
            finalAiScore = (localAiScore * 0.4) + (apiAiScore * 0.6);
        } else {
            finalAiScore = localAiScore;
        }

        // Round and ensure bounds
        finalAiScore = Math.round(Math.min(Math.max(finalAiScore, 0), 100));
        const humanScore = 100 - finalAiScore;

        // Determine verdict
        let verdict, verdictEmoji;
        if (finalAiScore >= 75) {
            verdict = 'AI Generated';
            verdictEmoji = '🤖';
        } else if (finalAiScore >= 45) {
            verdict = 'Mixed Content';
            verdictEmoji = '⚠️';
        } else {
            verdict = 'Human Written';
            verdictEmoji = '✅';
        }

        // Calculate confidence
        const confidence = aiApiAnalysis?.confidence || 
                          (localMetrics.wordCount > 100 ? 85 : localMetrics.wordCount > 50 ? 70 : 55);

        return {
            text,
            aiProbability: finalAiScore,
            humanProbability: humanScore,
            confidence,
            verdict,
            verdictEmoji,
            metrics: {
                perplexity: Math.round(localMetrics.perplexity),
                burstiness: Math.round(localMetrics.burstiness),
                entropy: Math.round(localMetrics.entropy),
                structureUniformity: Math.round(localMetrics.structureUniformity),
                vocabRichness: Math.round(localMetrics.vocabRichness),
                readabilityConsistency: Math.round(localMetrics.readabilityConsistency)
            },
            phraseAnalysis: localMetrics.phraseAnalysis,
            sentenceAnalysis,
            apiAnalysis: aiApiAnalysis,
            wordCount: localMetrics.wordCount,
            sentenceCount: localMetrics.sentenceCount
        };
    }

    // ===== RENDER RESULTS =====
    function renderAdvancedResults(results) {
        const { aiProbability, humanProbability, confidence, verdict, verdictEmoji, metrics, phraseAnalysis, sentenceAnalysis } = results;

        // Determine colors based on verdict
        let mainColor, bgColor;
        if (aiProbability >= 75) {
            mainColor = '#ef4444';
            bgColor = '#fef2f2';
        } else if (aiProbability >= 45) {
            mainColor = '#f59e0b';
            bgColor = '#fffbeb';
        } else {
            mainColor = '#10b981';
            bgColor = '#ecfdf5';
        }

        const summaryHTML = `
            <div class="analysis-result">
                <div class="result-header" style="border-color: ${mainColor}20; background: ${bgColor};">
                    <div class="verdict-badge" style="background: ${mainColor};">
                        <span class="verdict-emoji">${verdictEmoji}</span>
                        <span class="verdict-text">${verdict}</span>
                    </div>
                    <p class="confidence-text">Confidence: ${confidence}%</p>
                </div>

                <!-- Main Score Circle -->
                <div class="score-circle-container">
                    <div class="score-circle" style="--score: ${aiProbability}; --color: ${mainColor};">
                        <div class="score-inner">
                            <span class="score-value">${aiProbability}%</span>
                            <span class="score-label">AI Probability</span>
                        </div>
                    </div>
                </div>

                <!-- Percentage Bars -->
                <div class="percentage-bars">
                    <div class="percentage-item">
                        <div class="percentage-label">
                            <span class="label-icon">✅</span>
                            <span class="label-text">Human Written</span>
                            <span class="label-percentage">${humanProbability}%</span>
                        </div>
                        <div class="percentage-bar">
                            <div class="bar-fill human-bar" style="width: ${humanProbability}%"></div>
                        </div>
                    </div>
                    <div class="percentage-item">
                        <div class="percentage-label">
                            <span class="label-icon">🤖</span>
                            <span class="label-text">AI Generated</span>
                            <span class="label-percentage">${aiProbability}%</span>
                        </div>
                        <div class="percentage-bar">
                            <div class="bar-fill ai-bar" style="width: ${aiProbability}%"></div>
                        </div>
                    </div>
                </div>

                <!-- Advanced Metrics -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-icon">📊</div>
                        <div class="metric-info">
                            <span class="metric-label">Perplexity</span>
                            <span class="metric-value">${getMetricLevel(metrics.perplexity)}</span>
                        </div>
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${metrics.perplexity}%"></div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">💥</div>
                        <div class="metric-info">
                            <span class="metric-label">Burstiness</span>
                            <span class="metric-value">${getMetricLevel(metrics.burstiness)}</span>
                        </div>
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${metrics.burstiness}%"></div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">📚</div>
                        <div class="metric-info">
                            <span class="metric-label">Vocabulary Richness</span>
                            <span class="metric-value">${getMetricLevel(metrics.vocabRichness)}</span>
                        </div>
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${metrics.vocabRichness}%"></div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">📐</div>
                        <div class="metric-info">
                            <span class="metric-label">Structure Uniformity</span>
                            <span class="metric-value">${getMetricLevel(metrics.structureUniformity)}</span>
                        </div>
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${metrics.structureUniformity}%"></div>
                        </div>
                    </div>
                </div>

                <!-- Detected AI Phrases -->
                ${phraseAnalysis.detectedPhrases.length > 0 ? `
                    <div class="detected-section">
                        <h4>🎯 Detected AI Patterns (${phraseAnalysis.detectedPhrases.length})</h4>
                        <div class="phrases-list">
                            ${phraseAnalysis.detectedPhrases.slice(0, 15).map(p => 
                                `<span class="phrase-badge" title="Category: ${p.category}">${escapeHtml(p.phrase)}</span>`
                            ).join('')}
                            ${phraseAnalysis.detectedPhrases.length > 15 ? 
                                `<span class="phrase-badge more">+${phraseAnalysis.detectedPhrases.length - 15} more</span>` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Analysis Details -->
                <div class="analysis-footer">
                    <div class="stat-item">
                        <span class="stat-label">Words Analyzed</span>
                        <span class="stat-value">${results.wordCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sentences</span>
                        <span class="stat-value">${results.sentenceCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">AI Indicators</span>
                        <span class="stat-value">${phraseAnalysis.totalScore}</span>
                    </div>
                </div>
            </div>
        `;

        analysisSummary.innerHTML = summaryHTML;
        analysisSummary.style.display = 'block';

        // Render sentence-by-sentence highlighted output
        renderSentenceHighlighting(sentenceAnalysis, phraseAnalysis.detectedPhrases);
    }

    // ===== RENDER SENTENCE HIGHLIGHTING =====
    function renderSentenceHighlighting(sentenceAnalysis, detectedPhrases) {
        const phraseSet = new Set(detectedPhrases.map(p => p.phrase.toLowerCase()));

        const highlightedHTML = sentenceAnalysis.map(s => {
            let sentenceHTML = escapeHtml(s.text);
            
            // Highlight detected phrases within the sentence
            phraseSet.forEach(phrase => {
                const regex = new RegExp(`\\b(${escapeRegex(phrase)})\\b`, 'gi');
                sentenceHTML = sentenceHTML.replace(regex, '<mark class="ai-phrase">$1</mark>');
            });

            // Determine sentence class based on AI probability
            let sentenceClass = 'sentence-human';
            if (s.aiProbability >= 70) sentenceClass = 'sentence-ai';
            else if (s.aiProbability >= 40) sentenceClass = 'sentence-mixed';

            return `<span class="${sentenceClass}" title="AI Probability: ${s.aiProbability}%">${sentenceHTML}</span>`;
        }).join(' ');

        outputText.innerHTML = `
            <div class="highlighted-output">
                <div class="highlight-legend">
                    <span class="legend-item"><span class="legend-color human"></span> Likely Human</span>
                    <span class="legend-item"><span class="legend-color mixed"></span> Possibly Mixed</span>
                    <span class="legend-item"><span class="legend-color ai"></span> Likely AI</span>
                    <span class="legend-item"><span class="legend-color phrase"></span> AI Pattern</span>
                </div>
                <div class="highlighted-text">
                    ${highlightedHTML}
                </div>
            </div>
        `;
    }

    // ===== UTILITY FUNCTIONS =====
    function splitIntoSentences(text) {
        return text.match(/[^.!?]+[.!?]+/g) || [text];
    }

    function countSyllables(text) {
        const words = text.toLowerCase().split(/\s+/);
        let count = 0;
        words.forEach(word => {
            word = word.replace(/[^a-z]/g, '');
            if (word.length <= 3) { count += 1; return; }
            word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
            word = word.replace(/^y/, '');
            const matches = word.match(/[aeiouy]{1,2}/g);
            count += matches ? matches.length : 1;
        });
        return count;
    }

    function getMetricLevel(value) {
        if (value >= 70) return 'High';
        if (value >= 40) return 'Medium';
        return 'Low';
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
});
