// see https://kroki.io/examples.html

// indexed by ```language
var diagramsCodeLookup = {
    // BlockDiag https://github.com/blockdiag/blockdiag
    "blockdiag": {
        matchHeaderStr: "blockdiag {",
        reqType: "blockdiag",
    },

    // SeqDiag https://github.com/blockdiag/seqdiag
    "seqdiag": {
        matchHeaderStr: "seqdiag {",
        reqType: "seqdiag",
    },

    // ActDiag https://github.com/blockdiag/actdiag
    "actdiag": {
        matchHeaderStr: "actdiag {",
        reqType: "actdiag",
    },

    // NwDiag https://github.com/blockdiag/nwdiag
    "nwdiag": {
        matchHeaderStr: "nwdiag {",
        reqType: "nwdiag",
    },

    // PacketDiag https://github.com/blockdiag/nwdiag
    "packetdiag": {
        matchHeaderStr: "packetdiag {",
        reqType: "packetdiag",
    },

    // RackDiag https://github.com/blockdiag/nwdiag
    "rackdiag": {
        matchHeaderStr: "rackdiag {",
        reqType: "rackdiag",
    },

    // C4-PlantUML https://github.com/RicardoNiepel/C4-PlantUML
    "c4plantuml": {
        matchRegex: /^@startuml\s!include C4_/,
        reqType: "c4plantuml",
    },

    // PlantUML https://github.com/plantuml/plantuml
    "plantuml": {
        matchHeaderStr: "@start",
        reqType: "plantuml",
    },

    // Diagrams.net (Draw.io) https://diagrams.net
    "diagramsnet": {
        matchRegex: /^<mxfile/,
        reqType: "diagramsnet",
    },

    // Mermaid https://github.com/knsv/mermaid
    "mermaid": {
        matchRegex: /^(sequenceDiagram|graph\s+\w{2}|gantt|classDiagram|pie|gitGraph:|erDiagram|journey)\s*\n/,
        forceSVG: true,
        reqType: "mermaid",
    },

    // BPMN https://github.com/bpmn-io/bpmn-js
    "bpmn": {
        forceSVG: true,
        reqType: "bpmn",
    },

    // Bytefield https://github.com/Deep-Symmetry/bytefield-svg/
    "bytefield": {
        forceSVG: true,
        reqType: "bytefield",
    },

    // Ditaa http://ditaa.sourceforge.net/
    "ditaa": {
        reqType: "ditaa",
        trimCode: false
    },

    // Erd https://github.com/BurntSushi/erd
    "erd": {
        reqType: "erd",
    },

    // GraphViz https://www.graphviz.org/
    "graphviz": {
        matchRegex: /^digraph/,
        reqType: "graphviz",
    },

    // Nomnoml https://github.com/skanaar/nomnoml
    "nomnoml": {
        reqType: "nomnoml",
        forceSVG: true,
    },

    // Svgbob https://github.com/ivanceras/svgbob
    "svgbob": {
        reqType: "svgbob",
        forceSVG: true,
        trimCode: false
    },

    // UMlet https://github.com/umlet/umlet
    "umlet": {
        matchHeaderStr: "<umlet_diagram>",
        reqType: "umlet",
    },

    // Vega https://github.com/vega/vega
    "vega": {
        reqType: "vega",
        matchRegex: /{\s*"\$schema":\s"https:\/\/vega\.github\.io\/schema\/vega\//
    },

    // Vega-Lite https://github.com/vega/vega-lite
    "vegalite": {
        reqType: "vegalite",
        matchRegex: /{\s*"\$schema":\s"https:\/\/vega\.github\.io\/schema\/vega-lite\//
    },

    // WaveDrom https://github.com/wavedrom/wavedrom
    "wavedrom": {
        reqType: "wavedrom",
        forceSVG: true,
    },

};


// Return diagram properties according to language or by code. False = language unknown.
function getDiagramProps(language, code) {
	if (language && diagramsCodeLookup.hasOwnProperty(language))
		return diagramsCodeLookup[language];

	code = code.trim();

	for (const entry in diagramsCodeLookup) {
		var e = diagramsCodeLookup[entry];

		if (e.matchHeaderStr != null) {
			if (code.substr(0, e.matchHeaderStr.length) == e.matchHeaderStr)
				return e;
			continue;
		}

		if (e.matchRegex != null) {
			if (code.match(e.matchRegex))
				return e;
			continue;
		}
	}

	return false;
}
