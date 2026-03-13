export const SUBJECTS = ["Mathematics", "Science", "ICT", "History", "Geography", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"];

export const GRADE_SUBJECTS: Record<number, string[]> = {
  1: ["Mathematics", "Science", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  2: ["Mathematics", "Science", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  3: ["Mathematics", "Science", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  4: ["Mathematics", "Science", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  5: ["Mathematics", "Science", "English", "Sinhala", "Buddhism", "Tamil", "Health", "History", "Korean", "Japanese"],
  6: ["Mathematics", "Science", "ICT", "History", "Geography", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  7: ["Mathematics", "Science", "ICT", "History", "Geography", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  8: ["Mathematics", "Science", "ICT", "History", "Geography", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  9: ["Mathematics", "Science", "ICT", "History", "Geography", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  10: ["Mathematics", "Science", "ICT", "History", "Geography", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  11: ["Mathematics", "Science", "ICT", "History", "Geography", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  12: ["Mathematics", "Science", "ICT", "History", "Geography", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"],
  13: ["Mathematics", "Science", "ICT", "History", "Geography", "English", "Sinhala", "Buddhism", "Tamil", "Health", "Korean", "Japanese"]
};

export const LANGUAGES = [
  { name: "English", code: "en" },
  { name: "Sinhala", code: "si" },
  { name: "Tamil", code: "ta" },
  { name: "French", code: "fr" },
  { name: "German", code: "de" },
  { name: "Spanish", code: "es" },
  { name: "Chinese", code: "zh" },
  { name: "Japanese", code: "ja" },
  { name: "Korean", code: "ko" },
  { name: "Hindi", code: "hi" }
];

export const WEB_DEV_LESSONS = [
  {
    title: "HTML Basics",
    content: "HTML (HyperText Markup Language) is the skeleton of every website. It uses tags like <h1>, <p>, and <div> to structure content.",
    tips: "Always use semantic tags like <header> and <footer> for better SEO and accessibility."
  },
  {
    title: "CSS Styling",
    content: "CSS (Cascading Style Sheets) is used to style the HTML. You can change colors, fonts, and layouts using properties like 'display: flex' or 'grid'.",
    tips: "Use CSS Variables for consistent themes and easy maintenance."
  },
  {
    title: "JavaScript Logic",
    content: "JavaScript makes websites interactive. It can handle clicks, fetch data, and update the UI without reloading the page.",
    tips: "Master 'const' and 'let' before moving to complex frameworks like React."
  }
];
