# Markdown Diagrams <small>(browser extension)</small>

A browser extension for Chrome, Edge, Opera and Firefox that render markdown diagrams and charts code blocks into preview images.

## Supports many languages
[PlantUML](https://plantuml.com/), [Mermaid](https://mermaid-js.github.io/mermaid), [C4 with PlantUML](https://github.com/RicardoNiepel/C4-PlantUML), [GraphViz](https://www.graphviz.org), [Erd](https://github.com/BurntSushi/erd), [Nomnoml](http://www.nomnoml.com), [BPMN](https://bpmn.io), [BlockDiag](http://blockdiag.com), [SeqDiag](http://blockdiag.com/en/seqdiag), [ActDiag](http://blockdiag.com/en/actdiag), [NwDiag](http://blockdiag.com/en/nwdiag), [PacketDiag](http://blockdiag.com/en/nwdiag/packetdiag-examples.html), [RackDiag](http://blockdiag.com/en/nwdiag/rackdiag-examples.html), [Bytefield](https://github.com/Deep-Symmetry/bytefield-svg), [Ditaa](http://ditaa.sourceforge.net), [Svgbob](https://ivanceras.github.io/svgbob-editor), [UMlet](http://www.itmeyer.at/umlet/uml2), [Vega](https://vega.github.io/vega), [Vega-Lite](https://vega.github.io/vega-lite), [WaveDrom](https://wavedrom.com).

## Supports any website
- **GitHub** ([demo](https://github.com/marcozaccari/markdown-diagrams-browser-extension/tree/master/doc/examples)), **GitLab** ([demo](https://gitlab.com/markzackie/markdown-diagrams-browser-extension/-/tree/master/doc/examples)), **Bitbucket** ([demo](https://bitbucket.org/marcozaccari2/markdown-diagrams-browser-extension/src/master/doc/examples)): markdown files, pull requests, issues description, gists, wiki...
- **Atlassian**: Jira, Confluence, Trello...
- **all other websites** trying known patterns.
- **local files** when rendered with some markdown extension (for example [this](https://chrome.google.com/webstore/detail/markdown-preview-plus/febilkbfcbhebfnokafefeacimjdckgl)).

## Install

- <img height="16" src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Chrome_icon_%28September_2014%29.svg"> **Google Chrome**: *coming soon*
- <img height="16" src="https://upload.wikimedia.org/wikipedia/commons/a/a0/Firefox_logo%2C_2019.svg"> **Firefox**: [Markdown Diagrams - Firefox Add-ons](https://addons.mozilla.org/en-GB/firefox/addon/markdown-diagrams)
- <img height="16" src="https://upload.wikimedia.org/wikipedia/it/9/98/Microsoft_Edge_logo_%282019%29.svg"> **Edge**: *coming soon*
- <img height="16" src="https://upload.wikimedia.org/wikipedia/commons/4/49/Opera_2015_icon.svg"> **Opera**: *coming soon*


## How to use

Simply put diagram or chart code into a blockquote:
````markdown
```language

code here

```
````

Double click to rendered diagram to swith to code/diagram. 
Click to extension icon to disable/enable parsing in current browser tab.

## Examples
Diagrams and charts code examples [here](doc/examples) and [here](https://kroki.io/examples.html).

![Diagram example](https://kroki.io/plantuml/svg/eJxNjrEOwjAMRHd_hZUJkPoLVTswMMNWdYiK01hKE5S4C1-Po2RgsvXufOepiM1yHgEutysOw4jmEVnYBv5a4RQNADs0z3QQvqiIQfEUAat3kXzS2sV5a3ZsKXNMasz_OPPuRTVtAgqFKhsXZ3XtIeI57li1nrPc47uiT04blbK2W2UOYNKpj_8Ace07KA==)
<details>
    <summary>Show code</summary>

    ```plantuml
    @startuml
    (*) --> "Initialization"

    if "Some Test" then
    -->[true] "Some Action"
    --> "Another Action"
    -right-> (*)
    else
    ->[false] "Something else"
    -->[Ending process] (*)
    endif

    @enduml
    ```
</details>

![Chart example](https://kroki.io/mermaid/svg/eJwryEzlUnLJTy9WUrBSMLYw41JyTiwBcyxMuZSCoGxDUwDShQm9)
<details>
    <summary>Show code</summary>

    ```mermaid
    pie
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
    ```
</details>


#### Special thanks

Some work derived from https://github.com/dai0304/pegmatite and https://github.com/asciidoctor/asciidoctor-browser-extension.
