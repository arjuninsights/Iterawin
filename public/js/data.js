/* =====================================================
   iterawin – EDIT YOUR CONTENT HERE
   Public settings only. Technologies, projects and posts now live in
   the Oracle database and are managed from the owner dashboard (admin.html).
   ===================================================== */

const SITE = {
  tagline: "College projects, real skills and the push you need to keep going.",
  email: "hello@iterawin.com",              // your email (used if the form key below is empty)
  facebook: "https://facebook.com/",        // your Facebook page link
  youtube: "https://youtube.com/",          // your YouTube channel link

  /* CONTACT FORM → your email inbox (free)
     1. Go to https://web3forms.com, enter your email, get an Access Key.
     2. Paste the key below. Messages then arrive in your inbox.
     Leave it empty and the form opens the visitor's email app instead. */
  web3formsKey: "",

  /* WEATHER on the Today section (free, no key). Change to your city. */
  weatherPlace: "Patna",
  latitude: 25.61,
  longitude: 85.14
};

/* SERVICES – what you offer students. icon = any emoji. */
const SERVICES = [
  { icon:"🎓", title:"College projects",
    desc:"Ready-made and custom projects for your college submission.",
    points:["Full source code","Project report and PPT","Viva questions and explanation","Help for BCA, MCA, B.Tech and diploma"],
    topic:"College project", cta:"Get a project" },
  { icon:"🚀", title:"Skill-up training",
    desc:"Learn the skills companies ask for, one step at a time.",
    points:["Beginner friendly lessons","Practice tasks every week","Build real projects","Doubt solving"],
    topic:"Learn a technology", cta:"Start learning" },
  { icon:"🔥", title:"Motivation and inspiration",
    desc:"Stay focused, believe in yourself and keep moving forward.",
    points:["Daily thought and tip","Motivational videos and stories","Study and habit guidance","Support when you feel stuck"],
    topic:"Mentorship & guidance", cta:"Get inspired" },
  { icon:"🧭", title:"Career guidance",
    desc:"Get ready for internships and your first job.",
    points:["Resume and portfolio help","Interview preparation","GitHub profile setup","Roadmaps for each field"],
    topic:"Mentorship & guidance", cta:"Plan my career" }
];

/* DAILY INFORMATION
   One thought and one tip are chosen for each day automatically.
   Add as many lines as you like. The list rotates every midnight. */
const DAILY = {
  thoughts: [
    "Your project today is your portfolio tomorrow.",
    "You do not need to be perfect. You need to start.",
    "Every expert was once a beginner who did not quit.",
    "Learn one new thing today and write it down.",
    "Consistency builds what motivation starts.",
    "Your marks do not decide your skills. Practice does.",
    "Focus on the next step, not the whole staircase."
  ],
  tips: [
    "Commit your code at least once a day.",
    "Name things clearly. Future you will say thanks.",
    "Take a 5 minute break every hour to rest your eyes.",
    "Read an error message fully before searching for it.",
    "Keep a notes file of things you learn.",
    "Test your site on a phone, not only on a laptop.",
    "Compress images so your pages load fast."
  ]
};
