const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const FORM_FIELDS = {
  email: "Adresse e-mail",
  marque: "Marque",
  fournisseur: "Fournisseur de Réappro",
  reference: "Référence",
  designation: "Désignation pièce (Si en Anglais)",
  tarif: "Tarif",
  remise: "Remise"
};

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.options("*", cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const forbidden = /\.(exe|bat|sh|cmd|js)$/i;
    if (forbidden.test(file.originalname)) {
      return cb(new Error("Type de fichier non autorisé."), false);
    }
    cb(null, true);
  }
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function generateHtml(data) {
  const rows = Object.entries(FORM_FIELDS).map(([key, label]) => `
    <tr>
      <td style="padding:8px; border:1px solid #ccc; background:#f8f8f8; font-weight:bold;">${label}</td>
      <td style="padding:8px; border:1px solid #ccc;">${data[key] || '<em>(non renseigné)</em>'}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family:Arial; max-width:700px; margin:auto;">
      <h2 style="text-align:center; color:#007bff;">🔧 Formulaire Création Référence</h2>
      <table style="width:100%; border-collapse:collapse; margin-top:20px;">
        ${rows}
      </table>
      <p style="margin-top:20px;">📎 Des fichiers sont joints à ce message si fournis.</p>
    </div>
  `;
}

app.post("/submit-form", upload.array("fichiers[]"), async (req, res) => {
  const formData = req.body;
  const attachments = req.files.map(file => ({
    filename: file.originalname,
    path: file.path
  }));

  const mailOptions = {
    from: `"Formulaire création" <${process.env.EMAIL_USER}>`,
    to: process.env.DEST_EMAIL,
    subject: "📨Demande de création référence",
    html: generateHtml(formData),
    attachments
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Formulaire envoyé !");
  } catch (err) {
    console.error("Erreur :", err);
    res.status(500).send("Erreur lors de l'envoi.");
  } finally {
    req.files.forEach(file => fs.unlink(file.path, () => {}));
  }
});

app.get("/", (req, res) => {
  res.send("✅ Serveur opérationnel !");
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
