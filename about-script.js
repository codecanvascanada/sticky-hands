function initAboutPage() {
    console.log("about-script.js is running.");
    const matterContainer = document.querySelector('#matter-container');
    if (!matterContainer) return;

    // Clear previous canvas if it exists
    if (matterContainer.querySelector('canvas')) {
        matterContainer.innerHTML = '';
    }

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
    const currentLang = document.documentElement.lang || 'en';
    let employeeJsonPath = 'employees.json';

    if (currentLang !== 'en') {
        employeeJsonPath = `employees.${currentLang}.json`;
    }

    fetch(employeeJsonPath)
        .then(response => {
            if (!response.ok) {
                return fetch(`lang/${currentLang}.json`).then(langResponse => {
                    if (!langResponse.ok) {
                        throw new Error(`HTTP error! status: ${response.status} and failed to load lang/${currentLang}.json`);
                    }
                    return langResponse.json();
                }).then(langData => {
                    throw new Error(`${langData.error_failed_to_load_employees_json || 'Failed to load employees.json. Please ensure the file exists and is accessible.'} (Details: HTTP error! status: ${response.status})`);
                });
            }
            return response.json();
        })
        .then(employeeData => {
            const employees = employeeData; 
            const colorPalette = ['#5F7285', '#8E7E9F', '#A2B9BC', '#D0B49F', '#6C8E9D']; 

            const namesContainer = document.getElementById('employee-names-container');
            namesContainer.innerHTML = ''; // Clear old names
            const nameElements = []; 

            employees.forEach((employee, i) => {
                employee.groupColor = (employee.code === 100) ? '#FF4500' : colorPalette[employee.code]; 

                const nameDiv = document.createElement('div');
                nameDiv.className = 'employee-name-overlay';
                nameDiv.innerText = employee.name;
                namesContainer.appendChild(nameDiv);
                nameElements.push({ employeeData: employee, element: nameDiv, body: null });
            });

            const isMobile = window.innerWidth <= 768;
            const radiusMultiplier = isMobile ? 0.8 : 1; 
            let bodies;

            Composite.clear(world, false); // Clear existing bodies

            const nonCentralEmployees = employees.filter(emp => emp.code !== 100);
            const centralEmployees = employees.filter(emp => emp.code === 100);

            const otherBodies = nonCentralEmployees.map((employee) => {
                const baseRadius = Math.random() * 20 + 30;
                const radius = baseRadius * radiusMultiplier;
                const x = matterContainer.clientWidth / 2;
                const y = matterContainer.clientHeight / 2;

                const body = Bodies.circle(x, y, radius, {
                    label: 'employee',
                    restitution: 0.8,
                    friction: 0.5,
                    frictionAir: 0.5,
                    inertia: Infinity,
                    employeeData: employee,
                    render: {
                        fillStyle: employee.groupColor,
                    }
                });
                const originalIndex = employees.indexOf(employee);
                if (originalIndex !== -1) {
                    nameElements[originalIndex].body = body;
                }
                return body;
            });

            const centralBodies = centralEmployees.map((employee) => {
                const baseRadius = Math.random() * 20 + 30;
                const radius = baseRadius * radiusMultiplier;
                const x = matterContainer.clientWidth / 2; 
                const y = matterContainer.clientHeight / 2;

                const body = Bodies.circle(x, y, radius, {
                    label: 'employee',
                    restitution: 0.8,
                    friction: 0.5,
                    frictionAir: 0.5,
                    inertia: Infinity,
                    employeeData: employee,
                    render: {
                        fillStyle: employee.groupColor,
                    }
                });
                const originalIndex = employees.indexOf(employee);
                if (originalIndex !== -1) {
                    nameElements[originalIndex].body = body;
                }
                return body;
            });

            bodies = [...otherBodies, ...centralBodies]; 
            Composite.add(world, bodies); 

            const center = { x: matterContainer.clientWidth / 2, y: matterContainer.clientHeight / 2 };
            const pullForce = 0.0005; 
            const repulsionForce = 0.00025; 

            Events.on(engine, 'beforeUpdate', () => {
                bodies.forEach(body => {
                    const direction = { x: center.x - body.position.x, y: center.y - body.position.y };
                    Body.applyForce(body, body.position, {
                        x: direction.x * pullForce,
                        y: direction.y * pullForce
                    });
                    Body.setAngularVelocity(body, 0); 
                    Body.setAngle(body, 0); 

                    bodies.forEach(otherBody => {
                        if (body === otherBody) return;

                        const distance = Matter.Vector.magnitude(Matter.Vector.sub(body.position, otherBody.position));
                        const minDistance = body.circleRadius + otherBody.circleRadius;

                        if (distance < minDistance + 2) { 
                            const normal = Matter.Vector.normalise(Matter.Vector.sub(body.position, otherBody.position));
                            const forceMagnitude = (minDistance + 2 - distance) * repulsionForce; 

                            Body.applyForce(body, body.position, {
                                x: normal.x * forceMagnitude,
                                y: normal.y * forceMagnitude
                            });
                        }
                    });
                });
            });

            Events.on(engine, 'afterUpdate', () => {
                nameElements.forEach(item => {
                    if (item.body && item.element) {
                        item.element.style.left = `${item.body.position.x}px`;
                        item.element.style.top = `${item.body.position.y}px`;
                        const radius = item.body.circleRadius || 30; 
                        item.element.style.fontSize = `${Math.floor(radius * 0.4)}px`;
                    }
                });
            });

            const mouse = Mouse.create(render.canvas);
            const mouseConstraint = MouseConstraint.create(engine, {
                mouse: mouse,
                constraint: { stiffness: 0.1, render: { visible: false } }
            });
            Composite.add(world, mouseConstraint);

            const popup = document.getElementById('employee-popup');
            let currentBody = null; 

            function updatePopupPosition(eventMousePosition) {
                const matterContainerRect = matterContainer.getBoundingClientRect();
                popup.style.left = `${eventMousePosition.x - matterContainerRect.left}px`;
                popup.style.top = `${eventMousePosition.y - matterContainerRect.top}px`;

                if (isMobile) {
                    popup.classList.add('popup-mobile-above');
                } else {
                    popup.classList.remove('popup-mobile-above');
                }
            }

            Events.on(mouseConstraint, 'mousedown', (event) => {
                const foundBodies = Query.point(bodies, event.mouse.position);
                if (foundBodies.length > 0) {
                    const body = foundBodies[0];
                    currentBody = body; 
                    const { name, title } = body.employeeData;
                    popup.innerHTML = `<strong>${name}</strong><br><small>${title}</small>`;
                    popup.style.display = 'block';
                    updatePopupPosition(event.mouse.position); 
                }
            });

            Events.on(mouseConstraint, 'mousemove', (event) => {
                if (currentBody) { 
                    updatePopupPosition(event.mouse.position); 
                }
            });

            Events.on(mouseConstraint, 'mouseup', () => {
                if (currentBody) { 
                    currentBody = null;
                    popup.style.display = 'none';
                    popup.classList.remove('popup-mobile-above'); 
                }
            });

            matterContainer.addEventListener('mouseleave', () => {
                if (currentBody) { 
                    currentBody = null;
                    popup.style.display = 'none';
                    popup.classList.remove('popup-mobile-above'); 
                }
            });

            Runner.run(engine);
            Render.run(render);

            window.addEventListener('resize', () => {
                console.log("Window resized. Full responsive resize not implemented in this example.");
            });

        })
        .catch(error => {
            console.error('Error loading employee data:', error);
            const currentLangForError = document.documentElement.lang || 'en';
            fetch(`lang/${currentLangForError}.json`).then(langResponse => {
                if (!langResponse.ok) {
                    throw new Error(`Failed to load language file for error messages: lang/${currentLangForError}.json`);
                }
                return langResponse.json();
            }).then(langData => {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'fetch-error-message'; 
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
                    <h2>${langData.error_loading_employees || 'Error Loading Employee Data'}</h2>
                    <p>${langData.error_failed_to_load_employees_json || 'Failed to load employees.json. Please ensure the file exists and is accessible.'}</p>
                    <p>${langData.error_details || 'Details'}: ${error.message}</p>
                    <p>${langData.error_check_console || `Check the browser's developer console (F12) for network errors.`}</p>
                `;
                matterContainer.appendChild(errorDiv);
            }).catch(langError => {
                console.error('Secondary error fetching language for error message:', langError);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'fetch-error-message';
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
}

// Listen for the custom event to re-initialize the Matter.js scene
document.addEventListener('language-changed', initAboutPage);

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    // The i18n.js script will dispatch 'language-changed' on initial load,
    // so we don't need to call initAboutPage() here directly.
    // This prevents a double-load race condition.
});
