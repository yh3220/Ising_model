// main grid
let grid, grid_size;

// dimensions
let cell_length;

// simulation params
let j_in, kB, temperature, h_field;
let mc_steps;
let total_energy;

let energyChart, magChart;
let timeData = [];
let energyData = [];
let magData = [];
let simTime = 0;
let maxPoints = 300;

function getEnergy(grid) {
    let interaction_energy = 0;
    let field_energy = 0;

    let top_row, bottom_row, left_col, right_col;
    let top, bottom, left, right;

    for (let row = 0; row < grid_size; row++) {
        for (let col = 0; col < grid_size; col++) {
            if (row == 0) {
                top_row = grid_size - 1;
            }
            else {
                top_row = row - 1;
            }

            if (row == grid_size - 1) {
                bottom_row = 0;
            }
            else {
                bottom_row = row + 1;
            }

            if (col == 0) {
                left_col = grid_size - 1;
            }
            else {
                left_col = col - 1;
            }

            if (col == grid_size - 1) {
                right_col = 0;
            }
            else {
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

    if (row == 0) {
        top_row = grid_size - 1;
    }
    else {
        top_row = row - 1;
    }

    if (row == grid_size - 1) {
        bottom_row = 0;
    }
    else {
        bottom_row = row + 1;
    }

    if (col == 0) {
        left_col = grid_size - 1;
    }
    else {
        left_col = col - 1;
    }

    if (col == grid_size - 1) {
        right_col = 0;
    }
    else {
        right_col = col + 1;
    }

    let top = grid[top_row][col];
    let bottom = grid[bottom_row][col];
    let left = grid[row][left_col];
    let right = grid[row][right_col];
    let current = grid[row][col];

    return 2 * current * (j_in * (top + bottom + left + right) + h_field);
}

function getSpin(grid) {
    let total_spin = 0;

    for (let row = 0; row < grid_size; row++) {
        for (let col = 0; col < grid_size; col++) {
            total_spin += grid[row][col];
        }
    }
    return total_spin;
}
function getMagnetization(grid) {
    return getSpin(grid) / (grid_size * grid_size);
}

function initCharts() {
    const energyCtx = document.getElementById("energy-chart").getContext("2d");
    const magCtx = document.getElementById("mag-chart").getContext("2d");

    energyChart = new Chart(energyCtx, {
        type: "line",
        data: {
            labels: timeData,
            datasets: [{
                data: energyData,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
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
                borderWidth: 2,
                pointRadius: 0,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
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

function updateCharts() {
    let currentEnergy = getEnergy(grid);
    let currentMag = getMagnetization(grid);

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

    energyChart.update();
    magChart.update();
}
function updateColor(row, col) {
    if (grid[row][col] == 1) {
        context.fillStyle = "#fedd2b";
    }
    else {
        context.fillStyle = "#4c135c";
    }
    context.fillRect(col * cell_length, row * cell_length, cell_length, cell_length);
}

function update() {
    // mc_steps = 1;
    let row, col, dE;
    for (let step = 0; step < mc_steps; step++) {
        // select random cell and flip it
        row = Math.floor(Math.random() * grid_size);
        col = Math.floor(Math.random() * grid_size);
        dE = getEnergyDiff(grid, row, col);

        // init_energy = getEnergy(grid);
        // grid[row][col] *= -1;
        // final_energy = getEnergy(grid);
        // dE = final_energy - init_energy;
        // grid[row][col] *= -1;
        
        if (dE < 0) {
            grid[row][col] *= -1
            updateColor(row, col);
        }
        else {
            if (Math.random() < Math.exp(-dE / (kB * temperature))) {
                grid[row][col] *= -1
                updateColor(row, col);
            }
            else {
                continue;
            }
        }
    }

    let currentSpin = getSpin(grid);
    let currentEnergy = getEnergy(grid);
    
    spin_display.innerHTML = `Resultant spin: ${currentSpin}`;
    energy_display.innerHTML = `Total energy: ${currentEnergy}`;
    
    updateCharts();
}

function render() {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas_width, canvas_height);

    for (let row = 0; row < grid_size; row++) {
        for (let col = 0; col < grid_size; col++) {
            if (grid[row][col] == 1) {
                context.fillStyle = "#fedd2b";
            }
            else {
                context.fillStyle = "#4c135c";
            }
            context.fillRect(col * cell_length, row * cell_length, cell_length, cell_length);
        }
    }
}

function updateParams(variable) {
    if (variable == "size") {
        grid_size = size_input.value;
        size_display.innerHTML = `Grid size: ${grid_size} x ${grid_size}`;
        initGrid();
    }
    if (variable == "rate") {
        mc_steps = ((rate_input.value / 100) * grid_size * grid_size).toFixed(0);
        rate_display.innerHTML = `Updates per iteration: ${mc_steps} (${rate_input.value}%)`;
    }
    if (variable == "temp") {
        temperature = temp_input.value;
        temp_display.innerHTML = `Temperature: ${temperature}`;
    }
    if (variable == "j") {
        j_in = j_input.value;
        j_display.innerHTML = `Interaction strength: ${j_in}`;
    }
    if (variable == "h") {
        h_field = h_input.value;
        h_display.innerHTML = `External field: ${h_field}`;
}
}

function initGrid() {
    grid = [];
    cell_length = canvas_width / grid_size;

    for (let row = 0; row < grid_size; row++) {
        let new_row = [];
        for (let col = 0; col < grid_size; col++) {
            if (Math.random() < 0.5) {
                new_row.push(1);
            }
            else {
                new_row.push(-1);
            }
        }
        grid.push(new_row);
    }
    updateParams("rate");
    updateParams("temp");
    updateParams("j");
    updateParams("h");
    render();
    
    total_energy = getEnergy(grid);
    let currentMag = getMagnetization(grid);

    simTime = 0;
    timeData = [simTime];
    energyData = [total_energy];
    magData = [currentMag];
    
    if (energyChart && magChart) {
        energyChart.data.labels = timeData;
        energyChart.data.datasets[0].data = energyData;
    
        magChart.data.labels = timeData;
        magChart.data.datasets[0].data = magData;
    
        energyChart.update();
        magChart.update();
    }
}

function initParams() {
    updateParams("size");
    updateParams("rate");
    updateParams("temp");
    updateParams("j");
    updateParams("h");

    kB = 1;

    mc_steps = 0.01 * grid_size * grid_size;
    
    if (paused) {
        pauseToggle();
    }
}
