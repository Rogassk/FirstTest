# Customization Guide

This guide walks you through everything you can customize in your portfolio website. No prior coding experience needed — just follow along step by step.

> **Tip:** Use a code editor like [VS Code](https://code.visualstudio.com/) to edit files. It will color-code the syntax and make it much easier to read.

---

## Table of Contents

1. [Changing Your Name and Info](#1-changing-your-name-and-info)
2. [Changing Colors](#2-changing-colors)
3. [Updating the About Section](#3-updating-the-about-section)
4. [Editing Skills](#4-editing-skills)
5. [Adding Your Own Projects](#5-adding-your-own-projects)
6. [Adding a Profile Photo](#6-adding-a-profile-photo)
7. [Updating Contact Info and Social Links](#7-updating-contact-info-and-social-links)
8. [Setting Up the Contact Form](#8-setting-up-the-contact-form)
9. [Adding a New Section](#9-adding-a-new-section)
10. [Changing Fonts](#10-changing-fonts)

---

## 1. Changing Your Name and Info

Open `index.html` in your editor and search for these placeholders to replace:

| Find this text | Replace with | Where it appears |
|---|---|---|
| `Your Name` | Your actual name | Page title, nav logo, hero section, footer |
| `YN` | Your initials | Nav logo icon, hero image placeholder |
| `Web Developer & Designer` | Your title/role | Hero section |
| `I build clean, modern websites...` | Your intro sentence | Hero section |

### Example

**Before:**
```html
<h1 class="hero-name">Your Name</h1>
```

**After:**
```html
<h1 class="hero-name">Jane Smith</h1>
```

---

## 2. Changing Colors

All colors are defined in **one place** at the top of `styles.css`, inside the `:root` section. You only need to change the values there, and the entire site updates.

### The main colors to change:

```css
:root {
    /* Main brand color (buttons, links, accents) */
    --color-primary: #2563eb;

    /* Darker version (hover effects) */
    --color-primary-dark: #1d4ed8;

    /* Light tint (subtle backgrounds) */
    --color-primary-light: #dbeafe;
}
```

### Color scheme ideas:

| Theme | Primary | Dark | Light |
|---|---|---|---|
| **Blue** (default) | `#2563eb` | `#1d4ed8` | `#dbeafe` |
| **Green** | `#16a34a` | `#15803d` | `#dcfce7` |
| **Purple** | `#7c3aed` | `#6d28d9` | `#ede9fe` |
| **Red/Coral** | `#dc2626` | `#b91c1c` | `#fee2e2` |
| **Teal** | `#0d9488` | `#0f766e` | `#ccfbf1` |
| **Orange** | `#ea580c` | `#c2410c` | `#ffedd5` |
| **Pink** | `#db2777` | `#be185d` | `#fce7f3` |

### How to apply a new color scheme:

1. Open `styles.css`
2. Find the `:root {` section at the top (around line 30)
3. Replace the three color values with your chosen scheme
4. Save the file and refresh your browser

**Example — switching to purple:**

```css
--color-primary: #7c3aed;
--color-primary-dark: #6d28d9;
--color-primary-light: #ede9fe;
```

---

## 3. Updating the About Section

In `index.html`, find the section marked `<!-- ABOUT SECTION -->` and update:

### The paragraphs

Replace the placeholder text with your own story:

```html
<p>
    Hi there! I'm a passionate developer based in <strong>San Francisco</strong>.
    I love creating things that live on the internet, whether that's websites,
    applications, or anything in between.
</p>
```

### The stats

Update the numbers to match your experience:

```html
<div class="stat">
    <span class="stat-number">10+</span>
    <span class="stat-label">Projects Completed</span>
</div>
```

You can also change the labels (e.g., "Clients Served", "Cups of Coffee", etc.).

---

## 4. Editing Skills

### Changing an existing skill

Find the skill card you want to change in `index.html` and update the icon, name, and description:

```html
<div class="skill-card">
    <div class="skill-icon">PY</div>
    <h3 class="skill-name">Python</h3>
    <p class="skill-description">
        Building automation scripts and backend applications with Python.
    </p>
</div>
```

### Adding a new skill

Copy this block and paste it inside the `<div class="skills-grid">` container:

```html
<!-- Skill Card: YOUR NEW SKILL -->
<div class="skill-card">
    <div class="skill-icon">ICON</div>
    <h3 class="skill-name">Skill Name</h3>
    <p class="skill-description">
        A short description of your experience with this skill.
    </p>
</div>
```

Replace `ICON` with a short text symbol (1-3 characters), `Skill Name` with the skill name, and update the description.

### Removing a skill

Delete the entire `<div class="skill-card">...</div>` block for the skill you want to remove.

### Icon ideas

Since we use text-based icons, here are some ideas:

| Skill | Icon text |
|---|---|
| Python | `PY` |
| Java | `JV` |
| Node.js | `NJ` |
| Database/SQL | `DB` |
| AWS/Cloud | `&#9729;` |
| Mobile | `&#9743;` |

---

## 5. Adding Your Own Projects

### Editing an existing project

Find the project card in `index.html` and update:

```html
<div class="project-card">
    <div class="project-image">
        <!-- Replace placeholder with a real screenshot: -->
        <img src="images/my-project.png" alt="My Project Name">
    </div>
    <div class="project-info">
        <h3 class="project-name">My Project Name</h3>
        <p class="project-description">
            Describe what this project does and what you learned building it.
        </p>
        <div class="project-tags">
            <span class="tag">HTML</span>
            <span class="tag">CSS</span>
        </div>
        <div class="project-links">
            <a href="https://your-live-demo.com" class="project-link" target="_blank" rel="noopener noreferrer">
                Live Demo &#8599;
            </a>
            <a href="https://github.com/you/project" class="project-link" target="_blank" rel="noopener noreferrer">
                Source Code &#8599;
            </a>
        </div>
    </div>
</div>
```

### Adding a new project

Copy an entire `<div class="project-card">...</div>` block, paste it inside the `<div class="projects-grid">` container, and update the content.

### Using project screenshots

1. Create an `images` folder in your project directory
2. Save your screenshot there (e.g., `images/project1.png`)
3. Replace the placeholder div:

**Before:**
```html
<div class="project-image">
    <div class="project-image-placeholder">Project 1</div>
</div>
```

**After:**
```html
<div class="project-image">
    <img src="images/project1.png" alt="Description of the project screenshot">
</div>
```

### Removing a project

Delete the entire `<div class="project-card">...</div>` block.

---

## 6. Adding a Profile Photo

### Step 1: Prepare your photo
- Use a square image (e.g., 400x400 pixels) for best results
- Save it as `profile.jpg` (or `.png`) in your project folder

### Step 2: Replace the placeholder

In `index.html`, find the hero visual section and replace the placeholder:

**Before:**
```html
<div class="hero-image-placeholder">
    <span>YN</span>
</div>
```

**After:**
```html
<img
    src="profile.jpg"
    alt="Photo of Your Name"
    style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
>
```

The complete hero-visual block should look like:
```html
<div class="hero-visual">
    <div class="hero-image-placeholder">
        <img
            src="profile.jpg"
            alt="Photo of Your Name"
            style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
        >
    </div>
</div>
```

---

## 7. Updating Contact Info and Social Links

### Email

Find this line in `index.html` and replace with your email:

```html
<a href="mailto:your.email@example.com" class="contact-value">
    your.email@example.com
</a>
```

### Location

```html
<p class="contact-value">Your City, Country</p>
```

### Social media links

Find the `<div class="social-links">` section. Each link looks like:

```html
<a href="#" class="social-link" ...>
```

Replace `#` with your actual profile URL:

```html
<a href="https://github.com/yourusername" class="social-link" ...>
```

To **remove** a social link you don't use, delete the entire `<a class="social-link">...</a>` block.

---

## 8. Setting Up the Contact Form

The contact form uses [Formspree](https://formspree.io) to send emails without needing a server.

### Steps:

1. Go to [formspree.io](https://formspree.io) and create a free account
2. Click **"New Form"**
3. Give it a name (e.g., "Portfolio Contact")
4. Copy the **form ID** (it looks like `xyzabcde`)
5. In `index.html`, find this line:

```html
<form class="contact-form" id="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

6. Replace `YOUR_FORM_ID` with your actual form ID:

```html
<form class="contact-form" id="contact-form" action="https://formspree.io/f/xyzabcde" method="POST">
```

Now when someone fills out the form, you'll receive an email.

---

## 9. Adding a New Section

Here's how to add a completely new section (e.g., "Education", "Experience", "Testimonials"):

### Step 1: Add a nav link

In `index.html`, find the `<ul class="nav-links">` and add a new link:

```html
<li><a href="#education" class="nav-link">Education</a></li>
```

### Step 2: Add the section HTML

Add this between existing sections in `index.html`:

```html
<section class="section" id="education">
    <div class="container">
        <h2 class="section-title">Education</h2>
        <p class="section-subtitle">Where I've studied</p>

        <!-- Add your content here -->
        <div style="max-width: 720px; margin: 0 auto;">
            <p>Your education details go here.</p>
        </div>
    </div>
</section>
```

### Step 3: Style it (optional)

If you want alternating background colors, add one of these classes:
- No extra class = white background
- Add to the section: `style="background-color: var(--color-bg-alt);"` = light gray background

---

## 10. Changing Fonts

The site uses **Inter** from Google Fonts. To change it:

### Step 1: Pick a font

Go to [fonts.google.com](https://fonts.google.com) and browse fonts. Popular choices:
- **Poppins** — rounded and friendly
- **Roboto** — clean and neutral
- **Outfit** — modern and geometric
- **DM Sans** — elegant and compact

### Step 2: Update the HTML

In `index.html`, find the Google Fonts `<link>` tag and replace it. For example, to use Poppins:

**Before:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

**After:**
```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Step 3: Update the CSS

In `styles.css`, find the `--font-main` variable and update the font name:

```css
--font-main: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

---

## Need More Help?

- **HTML basics:** [MDN Web Docs - HTML](https://developer.mozilla.org/en-US/docs/Learn/HTML)
- **CSS basics:** [MDN Web Docs - CSS](https://developer.mozilla.org/en-US/docs/Learn/CSS)
- **JavaScript basics:** [MDN Web Docs - JavaScript](https://developer.mozilla.org/en-US/docs/Learn/JavaScript)
- **VS Code:** [code.visualstudio.com](https://code.visualstudio.com/)
- **GitHub Pages:** [docs.github.com/en/pages](https://docs.github.com/en/pages)
