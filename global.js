// GLOBAL VARIABLES
let animationInterval = null;
let isPlaying = false;

const examStartTimes = {
  'Midterm 1': new Date("2018-10-13T09:00:00-07:00"),
  'Midterm 2': new Date("2018-11-10T09:00:00-08:00"),
  'Final': null//new Date("2018-12-05T10:28:54-08:00")
};
const examDurations = {
  'Midterm 1': 90,
  'Midterm 2': 90,
  'Final': 180
};

async function loadACC() {
  const acc = await d3.csv('cleaned_data/final_acc.csv', d => {
    const rawTimestamp = new Date(d.timestamp_trunc);
    const exam = d.Exam;

    let examStart;
    if (exam === "Final") {
      examStart = new Date(rawTimestamp);
      examStart.setHours(11, 0, 0, 0); // force start at 11:00 AM
    } else {
      examStart = examStartTimes[exam];
    }

    const timeElapsed = rawTimestamp - examStart;
    const minutes = timeElapsed / 1000 / 60;

    if (exam === "Final" && minutes < 0) return null;

    return {
      subject: d.Subject,
      exam,
      minutes,
      magnitude: +d.magnitude_smooth,
    };
  });
  return acc.filter(d => d !== null);
}

async function loadFidgets() {
  const fidgets = await d3.csv('cleaned_data/fidgets.csv', d => {
    const rawTimestamp = new Date(d.start_time);
    const exam = d.Exam;

    let examStart;
    if (exam === "Final") {
      examStart = new Date(rawTimestamp);
      examStart.setHours(11, 0, 0, 0); // force start at 11:00 AM
    } else {
      examStart = examStartTimes[exam];
    }

    const timeElapsed = rawTimestamp - examStart;
    const minutes = timeElapsed / 1000 / 60;

    if (exam === "Final" && minutes < 0) return null;

    return {
      subject: d.Subject,
      exam,
      minutes,
      value: +d.smoothed_value,
    };
  });
  return fidgets;
}

function setupDropdowns(data) {
  const exams = Array.from(new Set(data.map(d => d.exam)));
  const subjects = Array.from(new Set(data.map(d => d.subject))).sort((a, b) => +a.slice(1) - +b.slice(1));

  const examSelect = d3.select('#exam-select');
  const subjectSelect = d3.select('#subject-select');

  examSelect.selectAll('option')
    .data(exams)
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => d);

  subjectSelect.selectAll('option')
    .data(subjects)
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => d);
}

function updateChart(data, fidgets) {
  const selectedExam = d3.select('#exam-select').property('value');
  const selectedSubject = d3.select('#subject-select').property('value');

  const filteredData = data.filter(d => d.exam === selectedExam && d.subject === selectedSubject);
  const filteredFidgets = fidgets.filter(d => d.exam === selectedExam && d.subject === selectedSubject);

  d3.select('#chart').selectAll('*').remove();
  const maxMinutes = examDurations[selectedExam] || Infinity;
  const trimmedAcc = filteredData.filter(d => d.minutes <= maxMinutes);
  const trimmedFidgets = filteredFidgets.filter(d => d.minutes <= maxMinutes);

  // Stop animation and reset
  if (animationInterval) {
    animationInterval.stop();
    animationInterval = null;
  }
  isPlaying = false;
  d3.select('#play-button').text('▶');

  d3.select('#time-slider').property('value', 0);
  d3.select('#time-label').text('0:00');
  d3.select('#chart').selectAll('*').remove();

  renderLinePlot(trimmedAcc, trimmedFidgets);
}

function formatTimeLabel(minutes) {
  const totalSeconds = Math.round(minutes * 60);  // round to closest second
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function renderLinePlot(data, fidgets) {
  const width = 800;
  const height = 400;
  const margin = { top: 10, right: 10, bottom: 50, left: 50 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').append('svg')
    .attr('width', width)
    .attr('height', height);

  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.minutes))
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.magnitude))
    .range([height - margin.bottom, margin.top]);

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  // add x-axis title
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", usableArea.left + usableArea.width / 2)
    .attr("y", height - 10)
    .text("Minutes Elapsed");

  // add y-axis title
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", `rotate(-90)`)
    .attr("x", - (usableArea.top + usableArea.height / 2))
    .attr("y", 15)
    .text("Movement Intensity");

  // add x-axis
  svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(xAxis);

  // add y-axis
  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(yAxis);

  const fullLine = d3.line().x(d => xScale(d.minutes)).y(d => yScale(d.magnitude));

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#ccc') // light gray
    .attr('stroke-width', 2)
    .attr('d', fullLine);

  const foregroundPath = svg.append('path')
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 2);

    const dots = svg.selectAll('.fidget-dot')
  .data(fidgets)
  .enter()
  .append('circle')
  .attr('class', 'fidget-dot')
  .attr('cx', d => xScale(d.minutes))
  .attr('cy', d => yScale(d.value))
  .attr('r', 3)  // 🔹 smaller radius
  .attr('fill', 'rgba(255, 99, 132, 0.8)')       // soft red
  .attr('stroke', 'rgba(255, 255, 255, 0.9)')     // white stroke
  .attr('stroke-width', 1.2)
  .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))')  // subtle glow
  .style('opacity', 0);


  // === Tooltip setup ===
  const tooltip = d3.select('#chart')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background', 'rgba(255, 255, 255, 0.95)')
    .style('border', '1px solid #ccc')
    .style('padding', '8px 12px')
    .style('border-radius', '8px')
    .style('box-shadow', '0 2px 5px rgba(0, 0, 0, 0.1)')
    .style('pointer-events', 'none')
    .style('font-size', '12px')
    .style('color', '#333')
    .style('display', 'none');

  const focus = svg.append('circle')
    .attr('r', 3.5)
    .attr('fill', '#007acc')
    .attr('stroke', 'white')
    .attr('stroke-width', 1.5)
    .style('display', 'none');

  // === Mouse overlay ===
  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('mousemove', function (event) {
      const [mx] = d3.pointer(event);
      const minute = xScale.invert(mx);

      // Find the closest data point
      const bisect = d3.bisector(d => d.minutes).left;
      const index = bisect(data, minute);
      const d0 = data[Math.max(0, index - 1)];
      const d1 = data[Math.min(index, data.length - 1)];
      const d = (minute - d0.minutes) < (d1.minutes - minute) ? d0 : d1;

      // Update circle
      focus
          .attr('cx', xScale(d.minutes))
          .attr('cy', yScale(d.magnitude))
          .style('display', null);

      // Update tooltip
      tooltip.style('left', `${xScale(d.minutes) + 10}px`)
        .style('top', `${yScale(d.magnitude) - 5}px`)
        .html(`Time: ${d.minutes.toFixed(1)} min<br>Magnitude: ${d.magnitude.toFixed(2)}`)
        .style('display', 'block');
    })
    .on('mouseout', function () {
      tooltip.style('display', 'none');
      focus.style('display', 'none');
    });
      
  const slider = d3.select('#time-slider');
  const timeDisplay = d3.select('#time-label');
  const playButton = d3.select('#play-button');
  const maxTime = Math.ceil(d3.max(data, d => d.minutes));
  slider.attr('max', maxTime);

  function updateVisiblePath(currentTime) {
    timeDisplay.text(formatTimeLabel(currentTime));
    slider.property('value', currentTime);
  
    const visibleData = data.filter(d => d.minutes <= currentTime);
    if (visibleData.length >= 2) {
      foregroundPath.datum(visibleData).attr('d', fullLine);
    }
  
    // Show fidgets that occurred up to current time
    dots
      .style('opacity', d => d.minutes <= currentTime ? .8 : 0);
  }

  slider.on('input', function () {
    if (isPlaying) togglePlayback();
    updateVisiblePath(+this.value);
  });

  playButton.on('click', togglePlayback);

  function togglePlayback() {
    let currentTime = +slider.property('value');

    if (currentTime >= maxTime && !isPlaying) {
      currentTime = 0;
      updateVisiblePath(0);
    }

    isPlaying = !isPlaying;
    playButton.text(isPlaying ? '⏸' : '▶');

    if (isPlaying) {
      const selectedExam = d3.select('#exam-select').property('value');
      const baseDuration = 5000;
      const animationLength = selectedExam === "Final" ? baseDuration * 2 : baseDuration;
      dots.style('opacity', 0); // reset
    
      // Animate dots with delays
      dots.each(function (d, i) {
        const delay = (d.minutes / maxTime) * animationLength;
        d3.select(this)
          .transition()
          .duration(500)
          .delay(delay)
          .style('opacity', .8);
      });
    
      let start = null;
    animationInterval = d3.timer(function (elapsed) {
    if (start === null) start = elapsed;

    
        let t = (elapsed - start) / animationLength;
        if (t > 1) {
          t = 1;
          animationInterval.stop();  // stop d3.timer
          isPlaying = false;
          playButton.text('▶');
        }
    
        const currentTime = t * maxTime;
        updateVisiblePath(currentTime);
      });
    } else {
      if (animationInterval) animationInterval.stop();  // Stop timer
      dots.interrupt();  // 🛑 Stop fidget dot animations
    }
  }

  // Draw initial state
  updateVisiblePath(0);
}

loadACC().then(data => {
  loadFidgets().then(fidgets => {
    setupDropdowns(data);
    updateChart(data, fidgets);

    // Attach change handlers
    d3.select('#exam-select').on('change', () => updateChart(data, fidgets));
    d3.select('#subject-select').on('change', () => updateChart(data, fidgets));
  });
});
