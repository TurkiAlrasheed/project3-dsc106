// import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const slider = d3.select("#slider");

const sampleRate = 32;  // Hz

const examStartTimes = {
    'Midterm 1': new Date("2018-10-13T09:00:00-07:00"),
    'Midterm 2': new Date("2018-11-10T09:00:00-07:00"),
    'Final': new Date("2018-12-05T10:28:54-07:00")
};


async function loadData() {
    const acc = await d3.csv('cleaned_data/acc.csv', d => {
        const rawTimestamp = new Date(d.timestamp_trunc);
        const exam = d.Exam;
        const examStart = examStartTimes[exam];
        const timeElapsed = rawTimestamp - examStart; // in ms
        return {
            subject: d.Subject,
            exam,
            minutes: timeElapsed / 1000 / 60,
            magnitude: Number(d.magnitude_detrended),
        }
    });
    console.log(acc);
    return acc;
}

function renderLinePlot(data) {
    const width = 800;
    const height = 600;
    const svg = d3.select('#chart').append('svg')
        //.attr('viewBox', `0 0 ${width} ${height}`)
        .attr('width', width)
        .attr('height', height)
        .style('overflow', 'visible'); 

    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.minutes))
        .range([usableArea.left, usableArea.right]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.magnitude))
        .range([usableArea.bottom, usableArea.top]);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // add x axis
    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // add y axis
    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const grouped = d3.groups(data, d => d.exam, d => d.subject);

    const color = d3.scaleOrdinal()
        .domain(grouped.flatMap(([exam, subs]) => subs.map(([subject]) => `${exam}-${subject}`)))
        .range(d3.schemeCategory10);

    const line = d3.line()
        .x(d => xScale(d.minutes))
        .y(d => yScale(d.magnitude));

    grouped.forEach(([exam, subjectGroups]) => {
        subjectGroups.forEach(([subject, values]) => {
            svg.append('path')
                .datum(values)
                .attr('fill', 'none')
                .attr('stroke', color(`${exam}-${subject}`))
                .attr('stroke-width', 1.5)
                .attr('d', line)
                .append('title')
                .text(`${exam} - ${subject}`);
        });
    });
}

loadData().then(renderLinePlot);