import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import { error } from 'console';
import compromise from 'compromise';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const nlp = compromise;

app.use(bodyParser.json());
app.use(cors());

// In-memory data store
const stringList = [
    {
        "id": "13560e721fb7c207699f165016bbaf0ea72ea224d058ad98d4de9649eea0e124",
        "value": "I am a happy fellow",
        "properties": {
            "length": 19,
            "is_palindrome": false,
            "unique_characters": 12,
            "word_count": 5,
            "sha256_hash": "13560e721fb7c207699f165016bbaf0ea72ea224d058ad98d4de9649eea0e124",
            "character_frequency_map": {
                "I": 1,
                " ": 4,
                "a": 3,
                "m": 1,
                "h": 1,
                "p": 2,
                "y": 1,
                "f": 1,
                "e": 1,
                "l": 2,
                "o": 1,
                "w": 1
            }
        },
        "created_at": "2025-10-20T14:25:31.831Z"
    },
    {
        "id": "93aaa38136ca4066cf2242d5cf41d3a1c3936d0a45d744fe78ac28cdbdb7962b",
        "value": "I am a going home",
        "properties": {
            "length": 17,
            "is_palindrome": false,
            "unique_characters": 10,
            "word_count": 5,
            "sha256_hash": "93aaa38136ca4066cf2242d5cf41d3a1c3936d0a45d744fe78ac28cdbdb7962b",
            "character_frequency_map": {
                "I": 1,
                " ": 4,
                "a": 2,
                "m": 2,
                "g": 2,
                "o": 2,
                "i": 1,
                "n": 1,
                "h": 1,
                "e": 1
            }
        },
        "created_at": "2025-10-20T14:25:43.283Z"
    },
    {
        "id": "ed01194c1bb6f7c6a60d842f86a5dff86a2b1413e3232454d5e29261495c01d2",
        "value": "I am a lucky chad",
        "properties": {
            "length": 17,
            "is_palindrome": false,
            "unique_characters": 11,
            "word_count": 5,
            "sha256_hash": "ed01194c1bb6f7c6a60d842f86a5dff86a2b1413e3232454d5e29261495c01d2",
            "character_frequency_map": {
                "I": 1,
                " ": 4,
                "a": 3,
                "m": 1,
                "l": 1,
                "u": 1,
                "c": 2,
                "k": 1,
                "y": 1,
                "h": 1,
                "d": 1
            }
        },
        "created_at": "2025-10-20T14:26:01.231Z"
    },
    {
        "id": "0081779c287d567d9ca622f4c0cc2ede819b0cc7f286a5f01d8c3c0178191ad6",
        "value": "level",
        "properties": {
            "length": 5,
            "is_palindrome": true,
            "unique_characters": 3,
            "word_count": 1,
            "sha256_hash": "0081779c287d567d9ca622f4c0cc2ede819b0cc7f286a5f01d8c3c0178191ad6",
            "character_frequency_map": {
                "l": 2,
                "e": 2,
                "v": 1
            }
        },
        "created_at": "2025-10-22T21:38:40.661Z"
    }
];

// Parse natural language query
function parseNaturalQuery(query) {
  const filters = {};
  const raw = String(query || "").toLowerCase();
  const doc = nlp(raw);

  // --- Palindrome (supports negation)
  if (doc.has("palindrome") || doc.has("palindromic")) {
    const negated = doc.before("palindrome").has("not") || doc.has("non palindromic");
    filters.is_palindrome = !negated;
  }

  // --- Word count
  if (doc.has("single word") || doc.has("one word")) {
    const negated = doc.before("single word").has("not");
    filters.word_count = negated ? { not: 1 } : 1;
  }

  // --- Length filters
  const longerMatch = raw.match(/\b(longer|greater|more)\s+than\s+(\d+)\b/);
  const shorterMatch = raw.match(/\b(shorter|less|fewer)\s+than\s+(\d+)\b/);
  const atLeastMatch = raw.match(/\bat\s+least\s+(\d+)\b/);
  const atMostMatch = raw.match(/\bat\s+most\s+(\d+)\b/);

  if (longerMatch) filters.min_length = parseInt(longerMatch[2], 10);
  if (shorterMatch) filters.max_length = parseInt(shorterMatch[2], 10);
  if (atLeastMatch) filters.min_length = parseInt(atLeastMatch[1], 10);
  if (atMostMatch) filters.max_length = parseInt(atMostMatch[1], 10);

  // --- Contains letter logic (robust + regex-based)
  const containLetterMatch =
    raw.match(/\b(contain(?:s|ing)?|with|that contain(?:s)?)\s+(?:the\s+)?(?:letter\s+)?([a-z])\b/) ||
    raw.match(/\b(?:letter)\s+([a-z])\b/i) ||
    raw.match(/\bcontains?\s+([a-z])\b/i);

  if (containLetterMatch) {
    const letter = containLetterMatch[2] || containLetterMatch[1];
    const negated = /\b(not|without|no)\b/.test(raw.split(letter)[0]);
    filters.contains_character = negated ? { not: letter.toLowerCase() } : letter.toLowerCase();
  }

  // --- Handle vowel words ("first vowel" etc.)
  const vowelMap = { first: "a", second: "e", third: "i", fourth: "o", fifth: "u" };
  const vowelMatch = raw.match(/\b(first|second|third|fourth|fifth)\s+vowel\b/);
  if (vowelMatch) filters.contains_character = vowelMap[vowelMatch[1]];
  if (raw.includes("first vowel") && !filters.contains_character)
    filters.contains_character = "a";

  if (Object.keys(filters).length === 0)
    throw new Error("Unable to parse natural language query");

  console.log("🔍 Parsed filters:", filters);
  return filters;
}

// Apply filters
function applyFilters(strings, filters) {
  return strings.filter(item => {
    const props = item.properties;
    const str = (item.value || "").toLowerCase();

    // Word count
    if (filters.word_count) {
      const wc = props.word_count;
      if (typeof filters.word_count === "object" && wc === filters.word_count.not) return false;
      if (typeof filters.word_count === "number" && wc !== filters.word_count) return false;
    }

    // Palindrome
    if (typeof filters.is_palindrome === "boolean") {
      if (props.is_palindrome !== filters.is_palindrome) return false;
    }

    // Length
    if (filters.min_length && props.length <= filters.min_length) return false;
    if (filters.max_length && props.length >= filters.max_length) return false;

    // Contains / not contains
    if (filters.contains_character) {
      if (typeof filters.contains_character === "object") {
        const letter = filters.contains_character.not.toLowerCase();
        if (str.includes(letter)) return false;
      } else {
        const letter = filters.contains_character.toLowerCase();
        if (!str.includes(letter)) return false;
      }
    }

    return true;
  });
}


// Routes

// Redirect root to /strings
app.get('/', (req, res) => {
    res.redirect('/strings');
});

// Get strings with optional filters
app.get('/strings', (req, res) => {
    const { is_palindrome, min_length, max_length, word_count, contains_character } = req.query;
    let filteredList = stringList;

    if (is_palindrome !== undefined) {
        const isPalindromeBool = is_palindrome === 'true';
        filteredList = filteredList.filter(item => item.properties.is_palindrome === isPalindromeBool);
    }

    if (min_length !== undefined) {
        const minLengthNum = parseInt(min_length, 10);
        filteredList = filteredList.filter(item => item.properties.length >= minLengthNum);
    }

    if (max_length !== undefined) {
        const maxLengthNum = parseInt(max_length, 10);
        filteredList = filteredList.filter(item => item.properties.length <= maxLengthNum);
    }

    if (word_count !== undefined) {
        const wordCountNum = parseInt(word_count, 10);
        filteredList = filteredList.filter(item => item.properties.word_count === wordCountNum);
    }

    if (contains_character !== undefined) {
        filteredList = filteredList.filter(item => item.value.includes(contains_character));
    }

    res.status(200).json({
        data: filteredList,
        count: filteredList.length,
        filters_applied: req.query
    });
})

// Filter by natural language query
app.get('/strings/filter-by-natural-language', (req, res) => {
    const { query } = req.query;

    if (!query) return res.status(400).json({ error: "Please include a natural language query (?query=...)" });

    try {
        const filters = parseNaturalQuery(query);
        const results = applyFilters(stringList, filters);

        if (results.length === 0) {
            return res.status(422).json({
            error: "Query parsed but resulted in no matches",
            parsed_filters: filters
            });
        }

        res.json({
            data: results,
            count: results.length,
            interpreted_query: {
                original: query,
                parsed_filters: filters
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get string by value
app.get('/strings/:value', (req, res) => {
    const { value } = req.params;
    const entry = stringList.find(item => item.value === value);

    if (entry) {
        res.status(200).json(entry);
    } else {
        res.status(404).json({ error: 'String does not exist in the system' });
    }       
})

// Add new string
app.post('/strings', (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) {
            return res.status(422).json({ error: "Missing 'value' field." });
        }

        // Invalid type
        if (typeof value !== 'string') {
            return res.status(422).json({ error: "'value' must be a string." });
        }

        // Duplicate
        if (stringList.find(item => item.value === value)) {
            return res.status(409).json({ error: 'String already exists.' });
        }

        const sha256_hash = crypto.createHash('sha256').update(value).digest('hex');

        const newEntry = {
            id: sha256_hash,
            value: value,
            properties: {
                length: value.length,
                is_palindrome: value === value.split('').reverse().join(''),
                unique_characters: new Set(value).size,
                word_count: value.trim().split(/\s+/).length,
                sha256_hash: sha256_hash,
                character_frequency_map: (() => {
                    const freqMap = {};
                    for (const char of value) {
                        freqMap[char] = (freqMap[char] || 0) + 1;
                    }
                    return freqMap;
                })(),
            },  
            created_at: new Date().toISOString()
        }

        stringList.push(newEntry);

        return res.status(201).json({
            message: 'String created successfully.',
            data: newEntry
        });
        
    } catch (error) {
        console.error('Error processing /data request:', error.message);
        
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while processing your request.',
        });
    }
});

// Delete string by value
app.delete('/strings/:value', (req, res) => {
  const { value } = req.params;
  const index = stringList.findIndex(item => item.value === value);

  if (index !== -1) {
    stringList.splice(index, 1);
    // 204 No Content → send no body at all
    return res.status(204).send();
  } else {
    // 404 Not Found → with JSON error message
    return res.status(404).json({ 
      error: 'String does not exist in the system.' 
    });
  }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 