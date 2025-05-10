const examStartTimes = {
  'Midterm 1': new Date("2018-10-13T09:00:00-07:00"),
  'Midterm 2': new Date("2018-11-10T09:00:00-08:00"),
  'Final': new Date("2018-12-05T10:28:54-08:00")
};

async function loadData() {
  const acc = await d3.csv('cleaned_data/acc.csv', d => {
      const rawTimestamp = new Date(d.timestamp_trunc);
      const exam = d.Exam;
      const examStart = examStartTimes[exam];
      const timeElapsed = rawTimestamp - examStart;

      return {
          subject: d.Subject,
          exam,
          minutes: timeElapsed / 1000 / 60,
          magnitude: +d.magnitude_detrended,
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
  renderLinePlot(filtered);
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

    svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(yAxis);

    const line = d3.line()
        .x(d => xScale(d.minutes))
        .y(d => yScale(d.magnitude));

    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', line);
}

loadData().then(data => {
    setupDropdowns(data);
    updateChart(data);

    // Attach change handlers
    d3.select('#exam-select').on('change', () => updateChart(data));
    d3.select('#subject-select').on('change', () => updateChart(data));
});