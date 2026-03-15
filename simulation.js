// =========================
// Ising model simulation
// accelerated Metropolis version
// =========================

// main grid
let grid, grid_size;

// dimensions
let cell_length;

// simulation params
let j_in, kB, temperature, h_field;
let mc_steps;

// running observables
let total_energy = 0;
let total_spin = 0;

// charts
let energyChart, magChart;
let timeData = [];
let energyData = [];
let magData = [];
let simTime = 0;
let maxPoints = 300;

// performance tuning
let chartUpdateInterval = 10;   // update Chart.js every N simulation iterations
let renderInterval = 2;         // redraw full lattice every N simulation iterations

// =========================
// physics helpers
// =========================
function getEnergy(grid) {
    let interaction_energy = 0;
    let field_energy = 0;

    let top_row, bottom_row, left_col, right_col;
    let top, bottom, left, right;

    for (let row = 0; row < grid_size; row++) {
        for (let col = 0; col < grid_size; col++) {
            if (row === 0) {
                top_row = grid_size - 1;
            } else {
                top_row = row - 1;
            }

            if (row === grid_size - 1) {
                bottom_row = 0;
            } else {
                bottom_row = row + 1;
            }

            if (col === 0) {
                left_col = grid_size - 1;
            } else {
                left_col = col - 1;
            }

            if (col === grid_size - 1) {
                right_col = 0;
            } else {
                right_col = col + 1;
            }

            top = grid[top_row][col];
            bottom = grid[bottom_row][col];
            left = grid[row][left_col];
            right = grid[row][right_col];

            interaction_energy += grid[row][col] * (top + bottom + left + right);
            field_energy += grid[row][col];
        }
    }

    interaction_energy /= 2;

    return -j_in * interaction_energy - h_field * field_energy;
}

function getEnergyDiff(grid, row, col) {
    let top_row, bottom_row, left_col, right_col;

    if (row === 0) {
        top_row = grid_size - 1;
    } else {
        top_row = row - 1;
    }

    if (row === grid_size - 1) {
        bottom_row = 0;
    } else {
        bottom_row = row + 1;
    }

    if (col === 0) {
        left_col = grid_size - 1;
    } else {
        left_col = col - 1;
    }

    if (col === grid_size - 1) {
        right_col = 0;
    } else {
        right_col = col + 1;
    }

    const top = grid[top_row][col];
    const bottom = grid[bottom_row][col];
    const left = grid[row][left_col];
    const right = grid[row][right_col];
    const current = grid[row][col];

    return 2 * current * (j_in * (top + bottom + left + right) + h_field);
}

function getSpin(grid) {
    let total = 0;

    for (let row = 0; row < grid_size; row++) {
        for (let col = 0; col < grid_size; col++) {
            total += grid[row][col];
        }
    }
    return total;
}

function getMagnetizationFromSpin(totalSpin) {
    return totalSpin / (grid_size * grid_size);
}

function recomputeObservables() {
    total_energy = getEnergy(grid);
    total_spin = getSpin(grid);
}

// =========================
// charts
// =========================
function initCharts() {
    const energyCtx = document.getElementById("energy-chart").getContext("2d");
    const magCtx = document.getElementById("mag-chart").getContext("2d");

    energyChart = new Chart(energyCtx, {
        type: "line",
        data: {
            labels: timeData,
            datasets: [{
                data: energyData,
                borderColor: "#00bfff",
                borderWidth: 4,
                pointRadius: 0,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: { title: { display: true, text: "t" } },
                y: { title: { display: true, text: "E" } }
            }
        }
    });

    magChart = new Chart(magCtx, {
        type: "line",
        data: {
            labels: timeData,
            datasets: [{
                data: magData,
                borderColor: "#00bfff",
                borderWidth: 4,
                pointRadius: 0,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: { title: { display: true, text: "t" } },
                y: {
                    min: -1,
                    max: 1,
                    title: { display: true, text: "m" }
                }
            }
        }
    });
}

function updateCharts(currentEnergy, currentMag) {
    simTime += 1;
    timeData.push(simTime);
    energyData.push(currentEnergy);
    magData.push(currentMag);

    if (timeData.length > maxPoints) {
        timeData.shift();
        energyData.shift();
        magData.shift();
    }

    energyChart.data.labels = timeData;
    energyChart.data.datasets[0].data = energyData;

    magChart.data.labels = timeData;
    magChart.data.datasets[0].data = magData;
}

function forceChartRedraw() {
    if (energyChart && magChart) {
        energyChart.update();
        magChart.update();
    }
}

// =========================
// display
// =========================
function updateColor(row, col) {
    if (grid[row][col] === 1) {
        context.fillStyle = "#fedd2b";
    } else {
        context.fillStyle = "#4c135c";
    }
    context.fillRect(col * cell_length, row * cell_length, cell_length, cell_length);
}

function render() {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas_width, canvas_height);

    for (let row = 0; row < grid_size; row++) {
        for (let col = 0; col < grid_size; col++) {
            if (grid[row][col] === 1) {
                context.fillStyle = "#fedd2b";
            } else {
                context.fillStyle = "#4c135c";
            }
            context.fillRect(col * cell_length, row * cell_length, cell_length, cell_length);
        }
    }
}

function refreshDisplay() {
    spin_display.innerHTML = `Resultant spin: ${total_spin}`;
    energy_display.innerHTML = `Total energy: ${total_energy}`;
}

// =========================
// simulation update
// =========================
function update() {
    let row, col, dE, oldSpin;

    for (let step = 0; step < mc_steps; step++) {
        row = Math.floor(Math.random() * grid_size);
        col = Math.floor(Math.random() * grid_size);

        oldSpin = grid[row][col];
        dE = getEnergyDiff(grid, row, col);

        if (dE <= 0 || Math.random() < Math.exp(-dE / (kB * temperature))) {
            grid[row][col] = -oldSpin;

            // incrementally update observables
            total_energy += dE;
            total_spin += -2 * oldSpin;
        }
    }

    refreshDisplay();

    const currentMag = getMagnetizationFromSpin(total_spin);
    updateCharts(total_energy, currentMag);

    if (simTime % renderInterval === 0) {
        render();
    }

    if (simTime % chartUpdateInterval === 0) {
        forceChartRedraw();
    }
}

// =========================
// parameter updates
// =========================
function updateParams(variable) {
    if (variable === "size") {
        grid_size = parseInt(size_input.value, 10);
        size_display.innerHTML = `Grid size: ${grid_size} x ${grid_size}`;
        initGrid();
        return;
    }

    if (variable === "rate") {
        mc_steps = Math.round((parseFloat(rate_input.value) / 100) * grid_size * grid_size);
        rate_display.innerHTML = `Updates per iteration: ${mc_steps} (${rate_input.value}%)`;
    }

    if (variable === "temp") {
        temperature = parseFloat(temp_input.value);
        temp_display.innerHTML = `Temperature: ${temperature}`;
    }

    if (variable === "j") {
        j_in = parseFloat(j_input.value);
        j_display.innerHTML = `Interaction strength: ${j_in}`;

        if (grid) {
            total_energy = getEnergy(grid);
            refreshDisplay();
            updateCharts(total_energy, getMagnetizationFromSpin(total_spin));
            forceChartRedraw();
        }
    }

    if (variable === "h") {
        h_field = parseFloat(h_input.value);
        h_display.innerHTML = `External field: ${h_field}`;

        if (grid) {
            total_energy = getEnergy(grid);
            refreshDisplay();
            updateCharts(total_energy, getMagnetizationFromSpin(total_spin));
            forceChartRedraw();
        }
    }
}

// =========================
// initialization
// =========================
function initGrid() {
    grid = [];
    cell_length = canvas_width / grid_size;

    for (let row = 0; row < grid_size; row++) {
        let new_row = [];
        for (let col = 0; col < grid_size; col++) {
            new_row.push(Math.random() < 0.5 ? 1 : -1);
        }
        grid.push(new_row);
    }

    // read current UI values
    if (rate_input) updateParams("rate");
    if (temp_input) updateParams("temp");
    if (j_input) updateParams("j");
    if (h_input) updateParams("h");

    recomputeObservables();
    render();
    refreshDisplay();

    simTime = 0;
    timeData = [simTime];
    energyData = [total_energy];
    magData = [getMagnetizationFromSpin(total_spin)];

    if (energyChart && magChart) {
        energyChart.data.labels = timeData;
        energyChart.data.datasets[0].data = energyData;

        magChart.data.labels = timeData;
        magChart.data.datasets[0].data = magData;

        forceChartRedraw();
    }
}

function initParams() {
    kB = 1;

    updateParams("size");
    updateParams("rate");
    updateParams("temp");
    updateParams("j");
    updateParams("h");

    if (typeof paused !== "undefined" && paused) {
        pauseToggle();
    }
}
