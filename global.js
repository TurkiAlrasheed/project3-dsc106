import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const svg = d3.select("svg");
const width = +svg.attr("width");
const height = +svg.attr("height");
const slider = d3.select("#slider");

const sampleRate = 32; // Hz
const examStartTime = new Date("2018-12-05T09:00:00-06:00"); // Adjust if needed

// 3D projection function (fake isometric)
function project3D(x, y, z) {
  const scale = 4;
  return {
    x: width / 2 + scale * (x - z * 0.5),
    y: height / 2 - scale * (y - z * 0.5)
  };
}

d3.csv("ACC.csv", d => ({
  x: +d[0],
  y: +d[1],
  z: +d[2]
})).then(data => {
  if (data.length === 0) {
    console.error("No data loaded.");
    return;
  }

  // Add time to each point
  data.forEach((d, i) => {
    d.time = new Date(examStartTime.getTime() + i * 1000 / sampleRate);
  });

  // Group data by second (1 frame per second)
  const frames = d3.groups(data, d => d.time.toISOString().slice(0, 19));
  slider.attr("max", frames.length - 1);

  function renderFrame(frameIndex) {
    const [t, points] = frames[frameIndex];

    const circles = svg.selectAll("circle")
      .data(points, (_, i) => i);

    circles.enter()
      .append("circle")
      .attr("r", 2)
      .attr("fill", "steelblue")
      .merge(circles)
      .attr("cx", d => project3D(d.x, d.y, d.z).x)
      .attr("cy", d => project3D(d.x, d.y, d.z).y);

    circles.exit().remove();
  }

  renderFrame(0); // Draw first frame

  slider.on("input", () => {
    const i = +slider.property("value");
    renderFrame(i);
  });
});