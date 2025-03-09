import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import nlp from 'compromise';
import { InferenceSession, Tensor } from 'onnxruntime-web';

// Initialize models
let useModel: use.UniversalSentenceEncoder | null = null;
let bertSession: InferenceSession | null = null;

// Load Universal Sentence Encoder model
async function loadUSEModel() {
  if (!useModel) {
    useModel = await use.load();
  }
  return useModel;
}

// Load BERT model for summarization
async function loadBERTModel() {
  if (!bertSession) {
    bertSession = await InferenceSession.create('/models/bert-base-uncased.onnx');
  }
  return bertSession;
}

// TextRank implementation for extractive summarization
class TextRank {
  private sentences: string[];
  private similarityMatrix: number[][];
  
  constructor(text: string) {
    this.sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    this.similarityMatrix = Array(this.sentences.length).fill(0)
      .map(() => Array(this.sentences.length).fill(0));
  }

  async buildSimilarityMatrix() {
    const model = await loadUSEModel();
    const embeddings = await model.embed(this.sentences);
    const embeddingArray = await embeddings.array();

    for (let i = 0; i < this.sentences.length; i++) {
      for (let j = 0; j < this.sentences.length; j++) {
        if (i !== j) {
          const similarity = tf.tensor1d(embeddingArray[i])
            .dot(tf.tensor1d(embeddingArray[j]))
            .div(
              tf.norm(tf.tensor1d(embeddingArray[i]))
                .mul(tf.norm(tf.tensor1d(embeddingArray[j])))
            );
          this.similarityMatrix[i][j] = similarity.dataSync()[0];
        }
      }
    }
  }

  rankSentences(damping = 0.85, iterations = 30): number[] {
    const n = this.sentences.length;
    let scores = Array(n).fill(1 / n);
    
    for (let iter = 0; iter < iterations; iter++) {
      const newScores = Array(n).fill(0);
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            newScores[i] += (this.similarityMatrix[j][i] * scores[j]) /
              this.similarityMatrix[j].reduce((sum, val, k) => k !== j ? sum + val : sum, 0);
          }
        }
        newScores[i] = (1 - damping) / n + damping * newScores[i];
      }
      
      scores = newScores;
    }
    
    return scores;
  }

  getSummary(numSentences = 3): string {
    const scores = this.rankSentences();
    const rankedSentences = this.sentences
      .map((sentence, index) => ({ sentence, score: scores[index] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, numSentences)
      .sort((a, b) => this.sentences.indexOf(a.sentence) - this.sentences.indexOf(b.sentence));
    
    return rankedSentences.map(item => item.sentence.trim()).join('. ') + '.';
  }
}

// VADER-inspired sentiment analysis
class SentimentAnalyzer {
  private readonly positiveWords: Set<string>;
  private readonly negativeWords: Set<string>;
  private readonly intensifiers: Set<string>;
  
  constructor() {
    this.positiveWords = new Set([
      'good', 'great', 'awesome', 'excellent', 'happy', 'love', 'wonderful',
      'fantastic', 'amazing', 'beautiful', 'best', 'perfect', 'brilliant'
    ]);
    
    this.negativeWords = new Set([
      'bad', 'terrible', 'awful', 'horrible', 'sad', 'hate', 'worst',
      'poor', 'disappointing', 'negative', 'wrong', 'failure', 'useless'
    ]);
    
    this.intensifiers = new Set([
      'very', 'extremely', 'incredibly', 'really', 'absolutely',
      'completely', 'totally', 'utterly', 'highly'
    ]);
  }

  analyze(text: string): { score: number; sentiment: string } {
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let intensifierCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prevWord = i > 0 ? words[i - 1] : '';
      
      if (this.positiveWords.has(word)) {
        score += intensifierCount > 0 ? 2 : 1;
      } else if (this.negativeWords.has(word)) {
        score -= intensifierCount > 0 ? 2 : 1;
      } else if (this.intensifiers.has(prevWord)) {
        intensifierCount++;
      }
    }
    
    const normalizedScore = score / (words.length / 2);
    
    return {
      score: normalizedScore,
      sentiment: normalizedScore > 0.2 ? 'positive' :
                normalizedScore < -0.2 ? 'negative' : 'neutral'
    };
  }
}

// Named Entity Recognition using Compromise.js
function extractEntities(text: string) {
  const doc = nlp(text);
  
  return {
    people: doc.people().out('array'),
    places: doc.places().out('array'),
    organizations: doc.organizations().out('array'),
    dates: doc.dates().out('array'),
    topics: doc.topics().out('array')
  };
}

// Text simplification
function simplifyText(text: string): string {
  const doc = nlp(text);
  
  // Convert passive voice to active
  doc.sentences().toPresent();
  
  // Simplify complex words
  const simplifications: { [key: string]: string } = {
    'utilize': 'use',
    'implement': 'use',
    'facilitate': 'help',
    'leverage': 'use',
    'optimize': 'improve'
  };
  
  Object.entries(simplifications).forEach(([complex, simple]) => {
    doc.replace(complex, simple);
  });
  
  return doc.text();
}

export async function analyzeText(text: string) {
  // Initialize TextRank
  const textRank = new TextRank(text);
  await textRank.buildSimilarityMatrix();
  
  // Initialize sentiment analyzer
  const sentimentAnalyzer = new SentimentAnalyzer();
  
  // Perform all analyses
  const summary = textRank.getSummary();
  const sentiment = sentimentAnalyzer.analyze(text);
  const entities = extractEntities(text);
  const simplifiedText = simplifyText(text);
  
  return {
    summary,
    sentiment,
    entities,
    simplifiedText
  };
}