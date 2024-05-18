const width = 3000; // Chart's dimensions
const height = 800;
const marginLeft = 40; // The space between the left side of the screen and the chart
const marginRight = 10;
const marginTop = 20;
const marginBottom = 30;

function chart(data) {
  /**
   * In order to perform a stacked series such that:
   * each individual element of series refers to a trait
   * and each individual stack refers to a tree, index the
   * data by treeNumber and then trait, finally get the score
   * value for each trait and tree.
   * The result is a matrix, where each column refers to a tree
   * and each row refers to a trait.
   */
  var series = d3.stack()
    .keys(d3.union(data.map(d => d.trait)))
    .value(([, D], key) => D.get(key).score)
    (d3.index(data, d => d.treeNumber, d => d.trait));

  /**
   * Create a new band scale (to map values on a descreet scale),
   * set the domain of it, group the data for treeNumber and order (decreasingly)
   * the groups by the sum of every value of each tree individual trait.
   */
  var x = d3.scaleBand()
    .domain(d3.groupSort(data, D => -d3.sum(D, d => d.score), d => d.treeNumber))
    .range([marginLeft, width - marginRight])
    .padding(0.01);

  /**
   * Create a new linear scale (to map values on a continuous scale),
   * set the domain interval between
   * 0 and the maximum value of the series.
   */
  const y = d3.scaleLinear()
    .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
    .rangeRound([height - marginBottom, marginTop]);

  /**
   * Create a new ordinal scale (to map values on a descreet scale) of colors,
   * map every key of every series to a color in a custom color palette.
   */
  const color = d3.scaleOrdinal()
    .domain(series.map(d => d.key))
    .range(["brown", "maroon", "green", "orange"]);

  /**
   * Create a new ordinal scale (to map values on a descreet scale) of forms,
   * map every key of every series to a form.
   */
  const form = d3.scaleOrdinal()
    .domain(series.map(d => d.key))
    .range(["line", "rect", "ellipse", "circle"]);

  /**
   * Create the SVG base for the chart.
   */
  var svg = d3.select("div#container").append("svg")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("viewBox", [0, 0, width, height]) // keep the graph responsive
    .classed("svg-container", true);

  function drawXaxis() {
    svg.selectAll("g.xAxis").remove();
    svg.append("g")
      .attr("class", "xAxis")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x))
      .call(g => g.selectAll(".domain").remove());
  }

  function drawYaxis() {
    svg.append("g")
      .attr("class", "yAxis")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).ticks(null, "s"))
      .call(g => g.selectAll(".domain").remove());
  }

  /**
   * Update all the forms based on the new x scale
   */
  function updateForms(){
    svg.selectAll(".trunk")
      .transition().duration(500)
      .attr("x", d => x(d.data[0]) + x.bandwidth() / 2.18)

    svg.selectAll(".roots")
      .transition().duration(500)
      .attr("x", d => x(d.data[0]) + 1.5)

    svg.selectAll(".crown")
      .transition().duration(500)
      .attr("cx", d => x(d.data[0]) + x.bandwidth() / 2)

    svg.selectAll(".fruits")
      .transition().duration(500)
      .attr("x", d => x(d.data[0]))
  }

  /**
   * Reorder the x domain based on the form clicked.
   * First filter the data and consider only the form clicked,
   * then sort the data using the score value, finally get the
   * ordered treeNumber.
   */
  function reorderOnClick() {
    var reorderForm = this.getAttribute("class");

    x = d3.scaleBand()
      .domain(d3.sort(data.filter(d => d.trait === reorderForm), d => d.score).map(d => d.treeNumber))
      .range([marginLeft, width - marginRight]);

    updateForms();
    drawXaxis();
  }

  const trunks = series.filter(d => form(d.key) === "rect");
  const roots = series.filter(d => form(d.key) === "line")
  const crowns = series.filter(d => form(d.key) === "ellipse");
  const fruits = series.filter(d => form(d.key) === "circle");

  var groundLevelHeight = d3.max(data.filter(d => d.trait === "roots").map(d => d.score));

  const sky = svg.append("rect")
    .attrs({
      height: y(groundLevelHeight),
      width: width,
      fill: "cyan",
      x: marginLeft,
      y: 0
    });
  const ground = svg.append("rect")
    .attrs({
      height: height - (y(groundLevelHeight) + marginBottom),
      width: width,
      fill: "maroon",
      x: marginLeft,
      y: y(groundLevelHeight)
    });

  /**
   * For every element existing in series, create a new group
   * if it does not already exist. Color every group based on
   * the key associated with it. Create a form element for every
   * group if it does not already exist. Position every form
   * and manage its attributes based on their values.
   */
  svg.append("g")
    .selectAll("g")
    .data(roots)
    .join("g")
    .attrs({
      "stroke": d => color(d.key),
      "stroke-width": "8"
    })
    .selectAll("line")
    .data(D => D)
    .join(
      enter => {
        var rootsSvg = enter
          .append("svg")
          .attrs({
            "stroke-linecap": "round",
            "class": "roots",
            "x": d => x(d.data[0])
          })
          .on("click", reorderOnClick);

        function singleRootPlacement(slope) {
          rootsSvg
          .append("line")
            .attrs({
              "x1": (x.bandwidth() / 2),
              "x2": slope,
              "y1": d => y(d[1] + (groundLevelHeight - d[1])),
              "y2": d => y(d[0] + (groundLevelHeight - d[1])) - 5
            });
        }

        singleRootPlacement((x.bandwidth() / 2));
        singleRootPlacement((x.bandwidth() / 2) + 80);
        singleRootPlacement((x.bandwidth()) - (x.bandwidth()/2 + 80));
      }
    );

  svg.append("g")
    .selectAll("g")
    .data(trunks)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(D => D)
    .join("rect")
    .attrs({
      "stroke-width": "5",
      "stroke": "#502204",
      "class": "trunk",
      "x": d => x(d.data[0]) + x.bandwidth() / 2.18,
      "y": d => y(d[1] + (groundLevelHeight - d.data[1].get("roots").score)),
      "height": d => y(d[0]) - y(d[1]),
      "width": x.bandwidth() / 12
    })
    .on("click", reorderOnClick);

  const flanneryPow = 0.57;
  const pi = 3.14;
  const cCrown = 0.63;
  svg.append("g")
    .selectAll("g")
    .data(crowns)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("ellipse")
    .data(D => D)
    .join("ellipse")
    .attrs({
      "stroke-width": "6",
      "stroke": "darkgreen",
      "class": "crown",
      "cx": d => x(d.data[0]) + x.bandwidth() / 2,
      // Tree height (roots + trunk) + major radius of ellipse + lifted heigth to reach ground level
      "cy": d => y((d[0] + (d[1] - d[0]) / (cCrown * pi)) + (groundLevelHeight - d.data[1].get("roots").score)),
      "ry": d => (2 + (y(d[0]) - y(d[1])) / (cCrown * pi))^ flanneryPow,
      "rx": d => (((y(d[0]) - y(d[1]))*0.8)/ (cCrown * pi))^ flanneryPow
    })
    .on("click", reorderOnClick);

  const cFruits = 3;
  svg.append("g")
    .selectAll("g")
    .data(fruits)
    .join("g")
    .selectAll(".fruits")
    .data(D => D)
    .join(
      enter => {
        var fruitsSvg = enter
          .append("svg")
          .attrs({
            "class": "fruits",
            "x": d => x(d.data[0])
          })
          .on("click", reorderOnClick);

        function singleFruitPlacement(xPlacement, yPlacement) {
          fruitsSvg
            .append("circle")
            .attrs({
              "class": "fruits",
              "stroke-width": "3",
              "stroke": "tomato",
              "fill": "orange",
              "cx": (x.bandwidth() / xPlacement),
              "cy": d => {
                var rootsHeight = d.data[1].get("roots").score;
                var baseHeight = ((d.data[1].get("trunk").score + rootsHeight) + (groundLevelHeight - rootsHeight));
                var scatterArea = (d.data[1].get("crown").score);
                return y(baseHeight + scatterArea * yPlacement);
              },
              "r": d => ((y(d[0]) - y(d[1])) / (cFruits * pi))^flanneryPow
            })
        }

        singleFruitPlacement(3, 1/4);
        singleFruitPlacement(2.5, 4/5);
        singleFruitPlacement(1.5, 2/4);
      }
    );

  drawXaxis();
  drawYaxis();
}

d3.json("dataset.json")
  .then(function(data) {
    chart(data);
})
