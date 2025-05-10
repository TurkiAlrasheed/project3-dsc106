const examStartTimes = {
  'Midterm 1': new Date("2018-10-13T09:00:00-07:00"),
  'Midterm 2': new Date("2018-11-10T09:00:00-08:00"),
  'Final': new Date("2018-12-05T10:28:54-08:00")
};
const examDurations = {
  'Midterm 1': 90,
  'Midterm 2': 90,
  'Final': 180  // or whatever duration you want for the Final
};

async function loadData() {
  const acc = await d3.csv('cleaned_data/final_acc.csv', d => {
      const rawTimestamp = new Date(d.timestamp_trunc);
      const exam = d.Exam;
      const examStart = examStartTimes[exam];
      const timeElapsed = rawTimestamp - examStart;

      return {
          subject: d.Subject,
          exam,
          minutes: timeElapsed / 1000 / 60,
          magnitude: +d.magnitude_smooth,
      };
  });
  return acc;
}

function setupDropdowns(data) {
  const exams = Array.from(new Set(data.map(d => d.exam)));
  const subjects = Array.from(new Set(data.map(d => d.subject)))
    .sort((a, b) => +a.slice(1) - +b.slice(1));

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

function updateChart(data) {
  const selectedExam = d3.select('#exam-select').property('value');
  const selectedSubject = d3.select('#subject-select').property('value');

  const filtered = data.filter(d => d.exam === selectedExam && d.subject === selectedSubject);
  console.log('Filtered data:', filtered);

  d3.select('#chart').selectAll('*').remove();
  const maxMinutes = examDurations[selectedExam] || Infinity;

const trimmed = filtered.filter(d => d.minutes <= maxMinutes);

  renderLinePlot(trimmed);
  //renderLinePlot(filtered);
}

function renderLinePlot(data) {
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

    const line = d3.line()
        .x(d => xScale(d.minutes))
        .y(d => yScale(d.magnitude));

    const path = svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', line);

    const totalLength = path.node().getTotalLength();

    // Reset path
    path.attr("stroke-dasharray", `${totalLength} ${totalLength}`)
        .attr("stroke-dashoffset", totalLength);

    // Button handler
    d3.select('#play-button').on('click', () => {
        path.attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(3000) // total animation duration in ms
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
    });

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
            tooltip
    .style('left', `${xScale(d.minutes) + 10}px`)
    .style('top', `${yScale(d.magnitude) - 5}px`)
                .html(`Time: ${d.minutes.toFixed(1)} min<br>Magnitude: ${d.magnitude.toFixed(2)}`)
                .style('display', 'block');
        })
        .on('mouseout', function () {
            tooltip.style('display', 'none');
            focus.style('display', 'none');
        });
}

loadData().then(data => {
    setupDropdowns(data);
    updateChart(data);

    // Attach change handlers
    d3.select('#exam-select').on('change', () => updateChart(data));
    d3.select('#subject-select').on('change', () => updateChart(data));
});