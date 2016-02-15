/// <reference path="lib/d3.d.ts"/>
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

// Can be root or child. So it takes parent class of both
class FDGNode {
	german: string;
	english: string;
	hub: boolean;
	separable: boolean;

	// todo: group number used for color - not a great implementation
	constructor(word: Word, public group: number) {
		// Use type of class to determine if it should be a hub
		if (word instanceof RootWord) {
			this.hub = true;
		} else {
			this.hub = false;
		}

		this.german = word.german;
		this.english = word.english;
		this.separable = word.separable;

	}
}

class FDGLink {
	separable: boolean;
	constructor(node: FDGNode, public source: number, public target: number, public value: number) {
		this.separable = node.separable;
	}
}

// Technically holds the fdg AND the container
class FDG {
	svg: any;
	//fdg: any;
	fdg: d3.layout.Force<d3.layout.force.Link<d3.layout.force.Node>, d3.layout.force.Node>
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
		this.fdg = d3.layout.force().gravity(0.05).charge(-1000).size([this.width, this.height])
			.nodes(nodes).links(links).linkDistance(function(this_link: FDGLink) {
			if (this_link.separable) {
				return 300;
			} else {
				return 150;
			}
		})
			.start();

		var drawn_links:d3.Selection<d3.layout.force.Link<d3.layout.force.Node>> = this.svg.selectAll(".link")
			.data(links)
			.enter().append("line")
			.attr("class", "link")
			.style("stroke-dasharray", function(this_link: FDGLink) {
				if (this_link.separable) {
					return 10;
				} else {
					return 0
				}
			})
			.style("stroke-width", function(this_link: FDGLink) {
				if (this_link.separable) {
					return Math.sqrt(this_link.value);
				} else {
					return this_link.value;
				}
			});

		var drawn_nodes: d3.Selection<d3.layout.force.Node> = this.svg.selectAll(".node")
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
			})

		this.fdg.on("tick", () => {
			this.adjustLinks(drawn_nodes, drawn_links)
		})

	}

	private adjustLinks(nodes: d3.Selection<d3.layout.force.Node>, links: d3.Selection<d3.layout.force.Link<d3.layout.force.Node>>) {
		nodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
		links.attr("x1", function(d: d3.layout.force.Link<d3.layout.force.Node>) { return d.source.x; })
			 .attr("y1", function(d: d3.layout.force.Link<d3.layout.force.Node>) { return d.source.y; })
			 .attr("x2", function(d: d3.layout.force.Link<d3.layout.force.Node>) { return d.target.x; })
		     .attr("y2", function(d: d3.layout.force.Link<d3.layout.force.Node>) { return d.target.y; });
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
		var new_links: FDGLink[] = [];

		nodes.forEach(function(node, index) {
			if (!node.hub) {
				new_links.push(new FDGLink(node, 0, index, 6))
			}
		});

		return new_links;
	}

	private clear_tree() {
		if (this.current_root) {
			this.svg.selectAll(".node").remove()
			this.svg.selectAll(".link").remove()
		}
	}
}

// // node is the data, 
// // box is the this context of the g svg
// // extracts radius and uses this to position node within x bounds
// function clampX(node, box) {
// 	var width = 700;
// 	   var rad = d3.select(box)[0][0].childNodes[0].r.animVal.value;
// 		  var newVal ;
//   if (node.x - rad < 0){
//  		      newVal = rad;
//     } else if (node.x + rad  > width) {
// 		      newVal = width - rad;
// 		  } else {
//         newVal = node.x;
// 	   }
//     node.x = newVal;
//     return node.x;
// }

// // node is the data, 
// // box is the this context of the g svg
// // extracts radius and uses this to position node within y bounds
// function clampY(node, box){
// 	var height = 700;
//     var rad = d3.select(box)[0][0].childNodes[0].r.animVal.value;
//     var newVal;
//     if (node.y - rad < 0){
//         newVal = rad;
//     } else if (node.y + rad > height) {
//         newVal = height - rad;
//     } else {
//         newVal = node.y;
//     }
//     node.y = newVal;
//     return node.y
// }


function run() {
	d3.json("data/data.json", function(error, json) {
		if (error) {return console.warn(error);}
		
		var german_words = new Dictionary(json);

		var fdg = new FDG(700, 700);
		fdg.build_new_tree(german_words.roots[6]);

	})
}

run();