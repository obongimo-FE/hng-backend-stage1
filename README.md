# 🧠 String Analyzer API

This project is a Node.js + Express API that allows users to store, retrieve, and filter strings — including **natural language filtering** such as:  
> “all single word palindromic strings”  
> “strings longer than 10 characters”  
> “palindromic strings that contain the first vowel”  
> “strings containing the letter z”

It supports basic CRUD operations and an intelligent natural language parser powered by [Compromise NLP](https://www.npmjs.com/package/compromise).

---

## 🚀 Features

- **Add new strings**  
- **Get all or individual strings**
- **Filter using multiple query parameters**
- **Filter using natural language**
- **Delete a string**
- **Error handling for invalid or conflicting queries**

---

## 🛠️ Tech Stack

- **Node.js** (v18+ recommended)
- **Express.js** – lightweight web framework
- **Compromise (NLP)** – for parsing natural language filters

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/string-filter-api.git
cd string-filter-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. (Optional) Create `.env` File
This project doesn’t strictly require environment variables,  
but if you want to configure the **port**, create a `.env` file in the root directory:

```bash
PORT=3000
```

### 4. Start the Server
```bash
npm start
```

Your server should now be running at  
👉 **http://localhost:3000**

---

## 🧩 API Endpoints

### **1. Add String**
**POST** `/strings`

**Body (JSON):**
```json
{
  "value": "level"
}
```

**Response:**
```json
{
  "message": "String added successfully.",
  "data": { "value": "level" }
}
```

---

### **2. Get All Strings**
**GET** `/strings`

---

### **3. Get a Specific String**
**GET** `/strings/:value`

**Example:**  
`GET http://localhost:3000/strings/level`

---

### **4. Filter by Natural Language**
**GET** `/strings/filter-by-natural-language?query=<your query>`

**Examples:**
- `/strings/filter-by-natural-language?query=all single word palindromic strings`
- `/strings/filter-by-natural-language?query=strings longer than 10 characters`
- `/strings/filter-by-natural-language?query=palindromic strings that contain the first vowel`
- `/strings/filter-by-natural-language?query=strings containing the letter z`

**Sample Success Response:**
```json
{
  "data": ["level", "madam", "wow"],
  "count": 3,
  "interpreted_query": {
    "original": "all single word palindromic strings",
    "parsed_filters": {
      "word_count": 1,
      "is_palindrome": true
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` → Unable to parse natural language query  
- `422 Unprocessable Entity` → Query parsed but conflicting filters  

---

### **5. Delete String**
**DELETE** `/strings/{string_value}`

**Example:**
`DELETE http://localhost:3000/strings/level`

✅ **Success (204 No Content)**  
❌ **Error (404 Not Found)** → `{ "error": "String does not exist in the system." }`

---

## 🧩 Dependencies

| Package | Purpose |
|----------|----------|
| **express** | Web framework for Node.js |
| **compromise** | Natural language processing (NLP) parser |
| **dotenv** | Environment variable loader (optional) |
| **nodemon** | Auto-restarts server in development (optional) |

Install all dependencies:
```bash
npm install express compromise dotenv
# Optional (for dev)
npm install --save-dev nodemon
```

---

## 🧪 Run Locally with Postman

Use [Postman](https://www.postman.com/) or cURL to test endpoints:

- **POST** `/strings` → Add a string  
- **GET** `/strings` → View all  
- **GET** `/strings/filter-by-natural-language?query=your query` → Test natural filtering  
- **DELETE** `/strings/{value}` → Remove a string  

---

## 📁 Project Structure

```
string-filter-api/
├── index.js
├── package.json
├── README.md
└── node_modules/
```

---
