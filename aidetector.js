document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analysisSummary = document.getElementById('analysisSummary');

    const AI_INDICATORS = {
        formality: [
            'it is important to note', 'it should be noted that', 'in conclusion', 'based on available information',
            'let’s explore the following points', 'this suggests that', 'it is crucial', 'it is imperative'
        ],
        transitions: [
            'furthermore', 'moreover', 'additionally', 'consequently', 'as a result', 'therefore',
            'in addition', 'however', 'on the other hand', 'first', 'second', 'third'
        ],
        hedging: [
            'may', 'might', 'could', 'likely', 'possibly', 'potentially', 'tends to', 'generally', 'commonly',
            'one possible reason is', 'it can be said that', 'research shows that'
        ],
        generic: [
            'many people believe that', 'it is commonly understood that', 'a variety of factors contribute to',
            'serves as a', 'plays a pivotal role', 'in the realm of', 'navigating the complexities'
        ],
        overlyExplanatory: [
            'to elaborate', 'for example', 'in other words', 'this means that', 'let’s break this down'
        ]
    };

    analyzeBtn.addEventListener('click', () => {
        const text = inputText.value.trim();
        if (!text) {
            analysisSummary.style.display = 'none';
            outputText.innerHTML = '';
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';
        analysisSummary.style.display = 'none';
        outputText.innerHTML = '';

        setTimeout(() => {
            const analysis = runFullAnalysis(text);

            outputText.innerHTML = analysis.highlightedText;
            analysisSummary.innerHTML = `This text is likely <span class="highlight">${analysis.probability.toFixed(0)}%</span> AI-generated. <br><small>${analysis.feedback}</small>`;
            analysisSummary.style.display = 'block';

            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze';
        }, 1500);
    });

    function runFullAnalysis(text) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const words = text.split(/\s+/);
        let highlightedText = text;
        let feedbackPoints = [];
        let totalScore = 0;

        // 1. Stylistic Pattern Analysis (Weight: 40%)
        let styleScore = 0;
        const allIndicators = [
            ...AI_INDICATORS.formality, ...AI_INDICATORS.transitions, ...AI_INDICATORS.hedging,
            ...AI_INDICATORS.generic, ...AI_INDICATORS.overlyExplanatory
        ];

        allIndicators.forEach(indicator => {
            const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
            const matches = text.match(regex);
            if (matches) {
                styleScore += matches.length * 1.5;
                highlightedText = highlightedText.replace(regex, `<span class="highlight">$&</span>`);
            }
        });

        const normalizedStyleScore = Math.min((styleScore / words.length) * 150, 40);
        if (normalizedStyleScore > 18) feedbackPoints.push('Overuse of formal, transitional, or hedging language');
        totalScore += normalizedStyleScore;

        // 2. Sentence Structure Uniformity (Weight: 25%)
        const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
        const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
        const lengthVariance = sentenceLengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / sentenceLengths.length;
        const structureScore = Math.max(20 - (Math.sqrt(lengthVariance) * 4), 0);
        if (structureScore > 12) feedbackPoints.push('Unnatural sentence length uniformity');
        totalScore += structureScore;

        // 3. N-gram Repetition (Weight: 15%)
        const ngrams = {};
        for (let i = 0; i < words.length - 3; i++) {
            const ngram = `${words[i]} ${words[i+1]} ${words[i+2]} ${words[i+3]}`.toLowerCase();
            ngrams[ngram] = (ngrams[ngram] || 0) + 1;
        }
        
        const repeatedNgrams = Object.entries(ngrams).filter(([, count]) => count > 1);
        
        repeatedNgrams.forEach(([ngram]) => {
            const regex = new RegExp(ngram.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            highlightedText = highlightedText.replace(regex, `<span class="highlight-repetition">$&</span>`);
        });

        const ngramScore = Math.min(repeatedNgrams.length * 4, 15);
        if (ngramScore > 7) feedbackPoints.push('Repetitive phrasing (4-word sequences)');
        totalScore += ngramScore;

        // 4. Vocabulary Diversity (Weight: 20%)
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        const diversityRatio = uniqueWords.size / words.length;
        const diversityScore = Math.max((0.55 - diversityRatio) * 120, 0); // Lower diversity = higher score
        if (diversityScore > 12) feedbackPoints.push('Low vocabulary diversity');
        totalScore += Math.min(diversityScore, 20);

        // Final Probability Calculation
        let finalProbability = totalScore;
        finalProbability = Math.min(finalProbability * 1.05, 99); // Scale and cap

        // Add randomness for realism
        finalProbability += (Math.random() * 6 - 3);
        finalProbability = Math.max(5, Math.min(finalProbability, 99)); // Clamp between 5 and 99

        return {
            probability: finalProbability,
            feedback: feedbackPoints.length > 0 ? `Analysis suggests: ${feedbackPoints.join(', ')}.` : 'The writing style appears consistent with human patterns.',
            highlightedText: highlightedText
        };
    }
});