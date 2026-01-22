document.addEventListener('DOMContentLoaded', () => {
    console.log("about-script.js is running.");
    const matterContainer = document.querySelector('#matter-container');
    if (!matterContainer) return;

    // --- Matter.js Aliases ---
    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Events, Body, Query } = Matter;

    // --- Engine Setup ---
    const engine = Engine.create({ 
        gravity: { x: 0, y: 0 },
        positionIterations: 10,
        velocityIterations: 10
    });
    const world = engine.world;

    // --- Renderer Setup ---
    const render = Render.create({
        element: matterContainer,
        engine: engine,
        options: {
            width: matterContainer.clientWidth,
            height: matterContainer.clientHeight,
            wireframes: false, // <-- Set to FALSE to see colors!
            background: 'transparent'
        }
    });

    // --- Walls ---
    const wallOptions = { isStatic: true, render: { visible: false } };
    const thickness = 60;
    Composite.add(world, [
        Bodies.rectangle(matterContainer.clientWidth / 2, -thickness / 2, matterContainer.clientWidth, thickness, wallOptions), // Top
        Bodies.rectangle(matterContainer.clientWidth / 2, matterContainer.clientHeight + thickness / 2, matterContainer.clientWidth, thickness, wallOptions), // Bottom
        Bodies.rectangle(-30, matterContainer.clientHeight / 2, 60, matterContainer.clientHeight, wallOptions), // Left
        Bodies.rectangle(matterContainer.clientWidth + 30, matterContainer.clientHeight / 2, 60, matterContainer.clientHeight, wallOptions)  // Right
    ]);

    // --- Employee Data (fetched from JSON) ---
    fetch('employees.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(employeeData => {
            const employees = employeeData; // Use fetched data
            const colorPalette = ['#5F7285', '#8E7E9F', '#A2B9BC', '#D0B49F', '#6C8E9D']; // 5 Modern, sophisticated colors

            // Container for HTML names
            const namesContainer = document.getElementById('employee-names-container');
            const nameElements = []; // To store references to name divs

            employees.forEach((employee, i) => {
                employee.groupColor = colorPalette[employee.code]; // Assign color based on 'code'

                // Create HTML element for the name
                const nameDiv = document.createElement('div');
                nameDiv.className = 'employee-name-overlay';
                nameDiv.innerText = employee.name;
                namesContainer.appendChild(nameDiv);
                nameElements.push({ employeeData: employee, element: nameDiv, body: null }); // 'body' will be assigned later
            });

            // Determine if it's a mobile screen
            const isMobile = window.innerWidth <= 768;
            const radiusMultiplier = isMobile ? 0.8 : 1; // Scale to 80% on mobile

            // --- Body Creation ---
            const bodies = employees.map((employee, i) => {
                const baseRadius = Math.random() * 20 + 30; // Original 30px to 50px radius
                const radius = baseRadius * radiusMultiplier; // Apply scaling
                const x = matterContainer.clientWidth / 2; // Start exactly at center X
                const y = matterContainer.clientHeight / 2; // Start exactly at center Y

                const body = Bodies.circle(x, y, radius, {
                    label: 'employee',
                    restitution: 0.8,
                    friction: 0.5,
                    frictionAir: 0.5,
                    inertia: Infinity, // Disable rotation for debugging
                    employeeData: employee,
                    render: {
                        fillStyle: employee.groupColor, // Apply the group color
                        // No sprite rendering
                    }
                });
                nameElements[i].body = body; // Assign the Matter.js body to the corresponding name element
                return body;
            });
            Composite.add(world, bodies);

            // --- Central Force ---
            const center = { x: matterContainer.clientWidth / 2, y: matterContainer.clientHeight / 2 };
            const pullForce = 0.0003; // Adjusted pull force for centering
            const repulsionForce = 0.001; // Very gentle repulsion

            Events.on(engine, 'beforeUpdate', () => {
                bodies.forEach(body => {
                    const direction = { x: center.x - body.position.x, y: center.y - body.position.y };
                    Body.applyForce(body, body.position, {
                        x: direction.x * pullForce,
                        y: direction.y * pullForce
                    });
                    Body.setAngularVelocity(body, 0); // Explicitly stop all rotation
                    Body.setAngle(body, 0); // Reset angle to 0

                    // Apply repulsion force from other bodies
                    bodies.forEach(otherBody => {
                        if (body === otherBody) return;

                        const distance = Matter.Vector.magnitude(Matter.Vector.sub(body.position, otherBody.position));
                        const minDistance = body.circleRadius + otherBody.circleRadius;

                        if (distance < minDistance + 10) { // Add a small buffer
                            const normal = Matter.Vector.normalise(Matter.Vector.sub(body.position, otherBody.position));
                            const forceMagnitude = (minDistance + 10 - distance) * repulsionForce; // Force increases as they get closer

                            Body.applyForce(body, body.position, {
                                x: normal.x * forceMagnitude,
                                y: normal.y * forceMagnitude
                            });
                        }
                    });
                });
            });

            // --- Update HTML Name Overlays ---
            Events.on(engine, 'afterUpdate', () => {
                nameElements.forEach(item => { // Iterate through nameElements which has both employeeData and element
                    if (item.body && item.element) {
                        item.element.style.left = `${item.body.position.x}px`;
                        item.element.style.top = `${item.body.position.y}px`;
                        const radius = item.body.circleRadius || 30; // Fallback radius
                        item.element.style.fontSize = `${Math.floor(radius * 0.4)}px`;
                    }
                });
            });

            // --- Mouse Interaction ---
            const mouse = Mouse.create(render.canvas);
            const mouseConstraint = MouseConstraint.create(engine, {
                mouse: mouse,
                constraint: { stiffness: 0.1, render: { visible: false } } // Set stiffness back to a small positive value
            });
            Composite.add(world, mouseConstraint);

            // --- Popup Logic for Canvas ---
            const popup = document.getElementById('employee-popup');
            let currentBody = null; // This will now only be set when a body is *pressed*

            // Helper to update popup position and class
            function updatePopupPosition(eventMousePosition) {
                const matterContainerRect = matterContainer.getBoundingClientRect();
                // Set the base left/top relative to the matterContainer's origin (top-left)
                popup.style.left = `${eventMousePosition.x - matterContainerRect.left}px`;
                popup.style.top = `${eventMousePosition.y - matterContainerRect.top}px`;

                // Apply mobile-specific class for CSS transform
                if (isMobile) {
                    popup.classList.add('popup-mobile-above');
                } else {
                    popup.classList.remove('popup-mobile-above'); // Ensure it's removed for desktop
                }
            }

            // On mousedown/touchstart, show popup
            Events.on(mouseConstraint, 'mousedown', (event) => {
                const foundBodies = Query.point(bodies, event.mouse.position);
                if (foundBodies.length > 0) {
                    const body = foundBodies[0];
                    currentBody = body; // Set currentBody on press
                    const { name, title } = body.employeeData;
                    popup.innerHTML = `<strong>${name}</strong><br><small>${title}</small>`;
                    popup.style.display = 'block';
                    updatePopupPosition(event.mouse.position); // Set initial position and class
                }
            });

            // On mousemove, update popup position IF a body is "active" (i.e., held down)
            Events.on(mouseConstraint, 'mousemove', (event) => {
                if (currentBody) { // Only position if a body is currently pressed/active
                    updatePopupPosition(event.mouse.position); // Update position dynamically
                }
            });

            // On mouseup/touchend, hide popup
            Events.on(mouseConstraint, 'mouseup', () => {
                if (currentBody) { // Only hide if a body was previously pressed
                    currentBody = null;
                    popup.style.display = 'none';
                    popup.classList.remove('popup-mobile-above'); // Clean up class
                }
            });

            // Add mouseleave listener to matterContainer to hide popup when mouse leaves canvas area
            // This acts as a fallback if mouseup doesn't fire (e.g., drag off canvas)
            matterContainer.addEventListener('mouseleave', () => {
                if (currentBody) { // Only hide if a body was active
                    currentBody = null;
                    popup.style.display = 'none';
                    popup.classList.remove('popup-mobile-above'); // Clean up class
                }
            });

            // --- Run Engine and Renderer ---
            Runner.run(engine);
            Render.run(render);

            // --- Resize Handling ---
            window.addEventListener('resize', () => {
                console.log("Window resized. Full responsive resize not implemented in this example.");
            });

        })
        .catch(error => {
            console.error('Error loading employee data:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'fetch-error-message'; // Add a class for styling
            errorDiv.style.color = 'red';
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '50%';
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translate(-50%, -50%)';
            errorDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
            errorDiv.style.padding = '20px';
            errorDiv.style.borderRadius = '10px';
            errorDiv.style.zIndex = '1000';
            errorDiv.innerHTML = `
                <h2>Error Loading Employee Data</h2>
                <p>Failed to load 'employees.json'. Please ensure the file exists and is accessible.</p>
                <p>Details: ${error.message}</p>
                <p>Check the browser's developer console (F12) for network errors.</p>
            `;
            matterContainer.appendChild(errorDiv);
        });
});