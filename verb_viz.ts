/// <reference path="lib/d3.d.ts"/>
// CONSTANTS
var TRANS_DURATION = 1000
var PAUSE_DURATION = 3000
var HUB_SCALE_FACTOR = 2

abstract class Word {
	constructor(public german: string, public english: string, public separable: boolean) {}
}

class ChildWord extends Word {
	constructor(german: string, english: string, separable: boolean) {
		super(german, english, separable);
	}
}


class RootWord extends Word {
	private children: ChildWord[];
	constructor(german: string, english: string, separable = false) {
		super(german, english, separable);
		this.children = [];
	}

	add_child(new_child: ChildWord) {
		this.children.push(new_child);
	}

	get_all_children() {
		return this.children;
	}
}


// Takes raw json from data.json -- stores all the data
// This might break if the names of the raw json changes be aware
class Dictionary {
	roots: RootWord[];
	constructor(input_json: any) {
		this.roots = [];
		this.build_all_roots(input_json);
		this.sort();
	}

	private build_all_roots(input_json: any) {
		input_json.forEach((child) => {
			this.roots.push(this.build_root(child));
		});
	}

	private build_root(raw_root: any) {
		var new_root = new RootWord(raw_root.root, raw_root.trans);
		
		raw_root.childWords.forEach(function(child) {
			new_root.add_child(new ChildWord(child.verb, child.trans, child.separ))
		});

		return new_root;
	}

	private sort () {
		this.roots.sort(function(root1: RootWord, root2: RootWord) {
			return root1.german.localeCompare(root2.german);
		});
	}
}

class FDGNode implements d3.layout.force.Node {
	x: number;
	y: number;
	hub: boolean;
	separable: boolean;
	german: string;
	english: string;
	constructor(word: Word, public group: number) {
		if (word instanceof RootWord) {
			this.hub = true;
		} else {
			this.hub = false;
		}

		this.x = 0;
		this.y = 0;
	
		this.separable = word.separable;
		this.german = word.german;
		this.english = word.english;
	}
}

class FDGLink<T extends FDGNode> implements d3.layout.force.Link<d3.layout.force.Node> {
	separable: boolean;
	constructor(public source: T, public target: T) {
		if (source.separable || target.separable) {
			this.separable = true;
		} else {
			this.separable = false;
		}
	}
}

// Technically holds the fdg AND the container
 class FDG {
 	svg: any;
	fdg: d3.layout.Force<FDGLink<FDGNode>, FDGNode>;
 	colors: d3.scale.Ordinal<string, string>;
 	node_rad: number;
 	hub_scale_factor: number;
 	trans_duration: number;
 	pause_duration: number;

 	private current_root: RootWord;

 	constructor(public width: number, public height: number) {
 		// create SVG
 		this.svg = d3.selectAll("div").select(function() { if (this.id == 'viz') return this; })
 					.append("svg").attr("width", this.width).attr("height", this.height);

 		// add bounding box
 		this.svg.append("rect")
 			.attr("x", 0)
 			.attr("y", 0)
 			.attr("width", this.width)
 			.attr("height", this.height)
 			.style("fill", "white")
 			.style("stroke", "black");

		// init constants
		this.colors = d3.scale.category20();
		this.node_rad = 30;
		this.hub_scale_factor = 2;
		this.trans_duration = 1000;
		this.pause_duration = 1000;

		this.current_root = null;
		this.fdg = null;
	}

	  build_new_tree(new_root: RootWord) {
		  this.clear_tree()
		  this.current_root = new_root;
		  var nodes = this.build_nodes();

		  var links = this.build_links(nodes);

		  this.fdg = d3.layout.force<FDGLink<FDGNode>, FDGNode>().gravity(0.05).charge(-1000).size([this.width, this.height])
		 	.nodes(nodes).links(links).linkDistance(function(this_link: FDGLink<FDGNode>) {
		 	if (this_link.separable) {
	 		return 300;
			} else {
				return 150;
			}
		}).start();

		var drawn_links:d3.Selection<FDGLink<FDGNode>> = this.svg.selectAll(".link")
			.data(links)
			.enter().append("line")
			.attr("class", "link")
			.style("stroke-dasharray", function(this_link: FDGLink<FDGNode>) {
				if (this_link.separable) {
					return 10;
				} else {
					return 0
				}
			})
			.style("stroke-width", function(this_link: FDGLink<FDGNode>) {
				if (this_link.separable) {
					return 2
				} else {
					return 6;
				}
			});

		var drawn_nodes: d3.Selection<FDGNode> = this.svg.selectAll(".node")
				.data(nodes)
				.enter().append("g")
				.attr("class", "node")
				.call(this.fdg.drag)

		drawn_nodes.append("circle")
			.attr("r", (node: FDGNode) => {
				if (node.hub) {
					return this.node_rad * this.hub_scale_factor;
				} else {
					return this.node_rad;
				}
			}).style("fill", (node: FDGNode) => {
				return this.colors(node.group.toString());
			});

		// create tooltip
		drawn_nodes.append('title').text(function(node) {
			return node.german + '\n' + node.english;
		});

		drawn_nodes.append("text")
				   .attr('text-anchor', 'middle')
				   .attr('dy', '.35em')
				   .style('fill', 'gray')
				   .style('stroke', 'black')
				   .text(function(node){
					   if (node.hub) {
						   return node.german
					   }
					   else {
					   	 	return node.german.slice(0, -new_root.german.length)
					   }
				   })

		var fdg_shallow = this.fdg;	   // closure captures this variable, just need to make it available.
		drawn_nodes.on('click', function(node) {
			//fdg_shallow.start();
			var this_g: d3.Selection<SVGGElement> = d3.select(this)
			
			// Adjust text 
			this_g.select('circle').transition().duration(TRANS_DURATION)
				.attr('r', HUB_SCALE_FACTOR * <any>this_g.select('circle').attr('r'))
				.style('opacity', 0.3)
				.each("start", function() {d3.select(this).style("pointer-events", "none");})
				.transition().delay(PAUSE_DURATION).duration(TRANS_DURATION)
				.attr('r', this_g.select('circle').attr('r'))
				.style('opacity', 1.0)
				.each('end', function() {d3.select(this).style('pointer-events', 'auto')});

			// super hacky
			var orig_text = this_g.select('text').text();

			this_g.select('text').transition().delay(TRANS_DURATION).text(node.english)
				.transition().delay(PAUSE_DURATION)
				.text(orig_text);
		});

		this.fdg.on("tick", () => {
			this.adjustLinks(drawn_nodes, drawn_links)
		})

	}

	private adjustLinks(nodes: d3.Selection<FDGNode>, links: d3.Selection<FDGLink<FDGNode>>) {
		nodes.attr("transform", (d) => { return "translate(" + this.clampX(d) + "," + this.clampY(d) + ")"; });
		links.attr("x1", function(d: FDGLink<FDGNode>) { return d.source.x; })
			 .attr("y1", function(d: FDGLink<FDGNode>) { return d.source.y; })
			 .attr("x2", function(d: FDGLink<FDGNode>) { return d.target.x; })
		     .attr("y2", function(d: FDGLink<FDGNode>) { return d.target.y; });
	}

	private build_nodes() {
		var i = 1;
		var new_nodes: FDGNode[] = []
		new_nodes.push(new FDGNode(this.current_root, i++));

		this.current_root.get_all_children().forEach(function(child){
			new_nodes.push(new FDGNode(child, i++));
		})

		return new_nodes;
	}

	private build_links(nodes: FDGNode[]) {
		var new_links: FDGLink<FDGNode>[] = [];

		// get hub node
		var center = nodes.filter(function(node) { if (node.hub) { return true; } })[0];

		nodes.forEach(function(node) {
			if (!node.hub) {
				new_links.push(new FDGLink(center, node))
			}
		});

		return new_links;
	}

	private clampX(node: FDGNode) {
		var newval: number;
		var radius: number;

		// Get radius
		if (node.hub) {
			radius = this.node_rad * this.hub_scale_factor;
		} else {
			radius = this.node_rad;
		}

		if (node.x < radius) {
			newval = radius;
		} else if (node.x > (this.width - radius)) {
			newval = this.width - radius;
		} else {
			newval = node.x
		}

		node.x = newval;

		return newval;
	}

	private clampY(node: FDGNode) {
		var newval: number;
		var radius: number;
		// Get radius
		if (node.hub) {
			radius = this.node_rad * this.hub_scale_factor;
		} else {
			radius = this.node_rad;
		}
			
		if (node.y < radius) {
			newval = radius;
		} else if (node.y > (this.height - radius)) {
			newval = this.height - radius;
		} else {
			newval = node.y
		}
			
		node.y = newval;
		return newval;
	}

	private clear_tree() {
		if (this.current_root) {
			this.svg.selectAll(".node").remove()
			this.svg.selectAll(".link").remove()
		}
	}
}

function run() {
	d3.json("data/data.json", function(error, json) {
		if (error) {return console.warn(error);}
		
		var german_words = new Dictionary(json);

		var fdg = new FDG(700, 700);
		fdg.build_new_tree(german_words.roots[6]);

	})
}

run();