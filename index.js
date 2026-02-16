// ---------------------------
// 1️⃣ Import des modules
// ---------------------------
const express = require("express")     // Framework serveur web
const bcrypt = require("bcrypt")       // Pour hasher et comparer les mots de passe
const { Pool } = require("pg")         // Client PostgreSQL
const bodyParser = require("body-parser") // Middleware pour lire les formulaires et JSON

// ---------------------------
// 2️⃣ Initialisation Express
// ---------------------------
const app = express()

// Middleware pour parser les formulaires HTML (application/x-www-form-urlencoded)
app.use(bodyParser.urlencoded({ extended: true }))
// Middleware pour parser le JSON si besoin
app.use(bodyParser.json())

// ---------------------------
// 3️⃣ Connexion PostgreSQL
// ---------------------------
// On récupère les variables d'environnement définies dans docker-compose.yml
const pool = new Pool({
  host: process.env.DB_HOST,       // Nom du service PostgreSQL dans Docker Compose
  user: process.env.DB_USER,       // Utilisateur PostgreSQL
  password: process.env.DB_PASSWORD, // Mot de passe
  database: process.env.DB_NAME,   // Nom de la DB
  port: 5432
})

// ---------------------------
// 4️⃣ Fonction d'attente PostgreSQL
// ---------------------------
// PostgreSQL peut mettre quelques secondes à démarrer
// Cette fonction tente de se connecter plusieurs fois avant de continuer
async function waitForPostgres(retries = 10, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1") // test simple de connexion
      console.log("PostgreSQL prêt ✅")
      return
    } catch (err) {
      console.log("En attente de PostgreSQL...")
      await new Promise(r => setTimeout(r, delay)) // attendre 1s avant le retry
    }
  }
  throw new Error("PostgreSQL non disponible après plusieurs essais ❌")
}

// ---------------------------
// 5️⃣ Initialisation de la DB
// ---------------------------
// On crée la table 'users' si elle n'existe pas
// Puis on crée un utilisateur par défaut 'Usertest ' avec mot de passe '1234'
async function initDB() {
  await waitForPostgres() // attendre que PostgreSQL soit prêt

  // Création de la table users si elle n'existe pas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `)
  console.log("Table 'users' OK ✅")

  // Vérifier si l'utilisateur Usertest  existe
  const res = await pool.query("SELECT * FROM users WHERE username=$1", ["Usertest"])
  if (res.rowCount === 0) {
    // Si non, on crée l'utilisateur avec mot de passe '1234'
    const hash = await bcrypt.hash("1234", 10) // hash du mot de passe
    await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
      ["Usertest", hash]
    )
    console.log("Utilisateur 'Usertest' créé avec mot de passe '1234' ✅")
  } else {
    console.log("Utilisateur 'Usertest' déjà présent dans la DB")
  }
}

// Appel de l'initialisation
initDB().catch(err => {
  console.error("Erreur lors de l'initialisation DB :", err)
  process.exit(1) // quitte l'application si la DB n'est pas disponible
})

// ---------------------------
// 6️⃣ Route GET / -> formulaire HTML
// ---------------------------
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Connexion</h1>
        <form method="POST" action="/login">
          <label>Username:</label><br/>
          <input type="text" name="username" /><br/><br/>
          <label>Password:</label><br/>
          <input type="password" name="password" /><br/><br/>
          <button type="submit">Login</button>
        </form>
      </body>
    </html>
  `)
})

// ---------------------------
// 7️⃣ Route POST /login -> traitement des credentials
// ---------------------------
app.post("/login", async (req, res) => {
  const { username, password } = req.body // on récupère username et password

  try {
    // Cherche l'utilisateur dans la DB
    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    )
    const user = result.rows[0]

    // Vérifie si l'utilisateur existe et si le mot de passe correspond
    if (user && await bcrypt.compare(password, user.password_hash)) {
      res.send(`<h2>Login réussi 🎉</h2><p>Bienvenue ${username}</p>`)
    } else {
      res.send(`<h2>Login échoué ❌</h2>`)
    }
  } catch (err) {
    console.error(err)
    res.status(500).send("Erreur serveur")
  }
})

// ---------------------------
// 8️⃣ Lancement du serveur
// ---------------------------
app.listen(3000, () => {
  console.log("Serveur lancé sur http://localhost:3000 🚀")
})
