/*
==============================================
PORTFOLIO WEBSITE — JavaScript
==============================================

This file adds interactive behavior to the website:
1. Mobile navigation menu (hamburger toggle)
2. Navbar shadow on scroll
3. Smooth scroll-to-section when clicking nav links
4. Scroll-triggered fade-in animations
5. Contact form handling
6. Auto-updating copyright year

Everything is well-commented so you can understand
exactly what each part does.
==============================================
*/


/*
----------------------------------------------
WAIT FOR THE PAGE TO LOAD
----------------------------------------------
"DOMContentLoaded" fires once all the HTML has been
read by the browser. We wrap everything in this so
we don't try to access elements that don't exist yet.
----------------------------------------------
*/
document.addEventListener('DOMContentLoaded', function () {

    // ==========================================
    // GRAB REFERENCES TO HTML ELEMENTS
    // ==========================================
    // We use document.getElementById and document.querySelectorAll
    // to find elements in the HTML so we can work with them.

    var navbar = document.getElementById('navbar');
    var navToggle = document.getElementById('nav-toggle');
    var navLinks = document.getElementById('nav-links');
    var contactForm = document.getElementById('contact-form');
    var yearSpan = document.getElementById('current-year');


    // ==========================================
    // 1. MOBILE MENU TOGGLE
    // ==========================================
    // When someone taps the hamburger icon on mobile,
    // we show/hide the navigation links.

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function () {
            // "toggle" adds the class if it's not there,
            // or removes it if it is — like a light switch.
            navLinks.classList.toggle('active');

            // Toggle the hamburger icon animation
            navToggle.classList.toggle('active');
        });
    }


    // ==========================================
    // 2. CLOSE MOBILE MENU WHEN A LINK IS CLICKED
    // ==========================================
    // After the user taps a nav link, close the menu
    // so it doesn't stay open while scrolling.

    var allNavLinks = document.querySelectorAll('.nav-link');
    allNavLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            // Remove the "active" class to close the mobile menu
            if (navLinks) {
                navLinks.classList.remove('active');
            }
            if (navToggle) {
                navToggle.classList.remove('active');
            }
        });
    });


    // ==========================================
    // 3. NAVBAR SHADOW ON SCROLL
    // ==========================================
    // When the user scrolls down, we add a subtle shadow
    // to the navbar to make it stand out from the content.

    window.addEventListener('scroll', function () {
        if (navbar) {
            // window.scrollY tells us how far down the page we've scrolled
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });


    // ==========================================
    // 4. SCROLL-TRIGGERED FADE-IN ANIMATIONS
    // ==========================================
    // Elements with the "fade-in" class start invisible.
    // When they scroll into view, we add the "visible" class
    // to make them fade in smoothly.
    //
    // We use the IntersectionObserver API — it watches for
    // elements entering the visible area of the screen.

    // Select all elements we want to animate
    var animatedElements = document.querySelectorAll(
        '.skill-card, .project-card, .about-text, .contact-info, .contact-form'
    );

    // Add the "fade-in" class to each element
    animatedElements.forEach(function (el) {
        el.classList.add('fade-in');
    });

    // Create the observer
    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    // When the element is at least 10% visible
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        // Stop watching this element (it only needs to animate once)
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                // "threshold: 0.1" means the animation triggers when
                // 10% of the element is visible on screen
                threshold: 0.1,
            }
        );

        // Start observing each animated element
        animatedElements.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        // Fallback for very old browsers that don't support IntersectionObserver:
        // Just make everything visible immediately.
        animatedElements.forEach(function (el) {
            el.classList.add('visible');
        });
    }


    // ==========================================
    // 5. CONTACT FORM HANDLING
    // ==========================================
    // When the user submits the contact form, we show
    // a success message. If you haven't set up Formspree
    // yet, this prevents the default form action.

    if (contactForm) {
        contactForm.addEventListener('submit', function (event) {
            // Check if the form action still has the placeholder
            var formAction = contactForm.getAttribute('action');
            var isPlaceholder = !formAction || formAction.indexOf('YOUR_FORM_ID') !== -1;

            if (isPlaceholder) {
                // Prevent the form from actually submitting
                // (since Formspree isn't set up yet)
                event.preventDefault();

                // Show a friendly success message
                showFormMessage(
                    'Thanks for your message! (Note: To receive emails, set up Formspree — see README.md)',
                    'success'
                );

                // Clear the form fields
                contactForm.reset();
            }
            // If Formspree IS set up, the form submits normally
            // and Formspree handles everything.
        });
    }

    /**
     * Shows a temporary message below the contact form.
     *
     * @param {string} text — The message to display
     * @param {string} type — "success" or "error" (controls the color)
     */
    function showFormMessage(text, type) {
        // Remove any existing message first
        var existingMsg = document.querySelector('.form-message');
        if (existingMsg) {
            existingMsg.remove();
        }

        // Create the message element
        var msg = document.createElement('div');
        msg.className = 'form-message';
        msg.textContent = text;

        // Style it based on the type
        msg.style.padding = '14px 20px';
        msg.style.borderRadius = '8px';
        msg.style.marginTop = '16px';
        msg.style.fontSize = '0.95rem';
        msg.style.fontWeight = '500';

        if (type === 'success') {
            msg.style.backgroundColor = '#dcfce7';
            msg.style.color = '#166534';
            msg.style.border = '1px solid #bbf7d0';
        } else {
            msg.style.backgroundColor = '#fef2f2';
            msg.style.color = '#991b1b';
            msg.style.border = '1px solid #fecaca';
        }

        // Add it to the page (after the form)
        contactForm.insertAdjacentElement('afterend', msg);

        // Automatically remove the message after 6 seconds
        setTimeout(function () {
            if (msg.parentNode) {
                msg.style.transition = 'opacity 0.3s ease';
                msg.style.opacity = '0';
                setTimeout(function () {
                    msg.remove();
                }, 300);
            }
        }, 6000);
    }


    // ==========================================
    // 6. AUTO-UPDATE COPYRIGHT YEAR
    // ==========================================
    // Sets the year in the footer to the current year
    // so you never have to manually update it.

    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

});
