import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
const svg = d3.select("svg");
const width = +svg.attr("width");
const height = +svg.attr("height");
const slider = d3.select("#slider");

const sampleRate = 32;  // Hz
const startTime = new Date("2018-12-05T09:00:00-06:00");  // Set exam start time

// Project 3D to 2D (fake isometric)
function project3D(x, y, z) {
  const scale = 4;
  return {
    x: width / 2 + scale * (x - z * 0.5),
    y: height / 2 - scale * (y - z * 0.5)
  };
}

// Load CSV
d3.csv("cleaned_data/acc_data.csv", d => ({
  x: +d[0],
  y: +d[1],
  z: +d[2]
})).then(data => {
  if (!data || data.length === 0) {
    console.error("CSV is empty or failed to parse.");
    return;
  }

  // Assign timestamps
  data.forEach((d, i) => {
    d.time = new Date(startTime.getTime() + i * 1000 / sampleRate);
  });

  // Group into 1-second frames
  const frames = d3.groups(data, d => d.time.toISOString().slice(0, 19));
  slider.attr("max", frames.length - 1);

  function renderFrame(i) {
    const [, points] = frames[i];

    const dots = svg.selectAll("circle")
      .data(points, (_, j) => j);

    dots.enter()
      .append("circle")
      .attr("r", 2)
      .attr("fill", "steelblue")
      .merge(dots)
      .attr("cx", d => project3D(d.x, d.y, d.z).x)
      .attr("cy", d => project3D(d.x, d.y, d.z).y);

    dots.exit().remove();
  }

  // Initial draw
  renderFrame(0);

  // Slider interaction
  slider.on("input", () => {
    const i = +slider.property("value");
    renderFrame(i);
  });
});