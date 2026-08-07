# Ready to Start Writing - Follow MD rules below

**This is the markdown formatting validated to be well rendered to Static HTML along with the PDF exportation. Please only use these validated formats**

## Markdown comments

```markdown
<!-- Comments are written this way - not published -->
<!-- shortcut for comments: alt + shift + a -->
```

## Paragraph

Always add a space after a punctuation mark to return to a new line.
To create a new paragraph, add two spaces at the end of the line.

Here is my new paragraph is this one. 

## Title hierarchy

You don't have to care about numbering, this will be automatically done during rendering process.

```markdown
# Title level 1
## Title level 2
### Title level 3
#### level 4
##### level 5
###### level 6
```

<span style="color: red;">Rendering:</span>

![](images/render.png)

## Bold text

```markdown
**my bold text**
```

<span style="color: red;">Rendering:</span>

**my bold text**

## Italic text

```markdown
*my italic text*
```

<span style="color: red;">Rendering:</span>

*my italic text*

## Create a note

```markdown
> This is a note...
```

<span style="color: red;">Rendering:</span>

> This is a note...

## Code or CLI output

````markdown
```plaintext
regress@rtme-mx-25> show version 
Hostname: rtme-mx-25
Model: mx480
Family: junos
Junos: 25.2I-20250303.0.2029
```
````

<span style="color: red;">Rendering:</span>

```plaintext
regress@rtme-mx-25> show version 
Hostname: rtme-mx-25
Model: mx480
Family: junos
Junos: 25.2I-20250303.0.2029
```

## External Links

```markdown
[external-link-name](https://www.example.com)
```

<span style="color: red;">Rendering:</span>

[external-link-name](https://www.example.com)

## Internal reference/link to a section

```mardown
If you want to refer to a given section inside the same markdown file, use:

[Go to this section](#<this is a section reference>)

If you want to refer to a given section inside another markdown file part of the same book, use:

[Go to this far section](chapterX.md#<this is a section reference>)
```

<span style="color: red;">Rendering:</span>

[Go to this section](#bold-text)


## Internal reference inside the text body

```mardown
Your internal reference other than a section is created like that - the anchorX (X is a random/incrementing number that must be choosen/managed by the Author). It has a only meaning for mkdocs and is not visible by the reader: 

[Internal-reference-name](#anchorX)

Then position your anchorX wherevever you want in the body by using this simple html code in your markdown file:

<a id="anchorX"></a>
```

<span style="color: red;">Rendering:</span>

Your internal reference other than a section is created like that - the anchorX (X is a random/incrementing number that must be choosen/managed by the Author). It has a only meaning for mkdocs and is not visible by the reader: 

[Internal-reference-name](#anchor1)

Then position your anchorX wherevever you want in the body by using this simple html code in your markdown file:

## Images

```markdown 
Add figure caption if needed - numbering will be managed by the tool. 

By default the image size is set to 70% and the image is clickable to open a "modal" for zooming in. They are also center automatically.

![your image caption](images/logo.png)
```

<span style="color: red;">Rendering:</span>

![your image caption](images/logo.png)
<p class="table-caption" style="text-align:center; font-style:italic;">Figure 1: your image caption</p>


> Image Caption numbering is incremented automatically and has a global significance.

```markdown
If you want to override the default size of an image you should use the { width: x%} like below:

![a smaller image](images/logo.png){ width=20%} 
```

<span style="color: red;">Rendering:</span>

![your image caption](images/logo.png){ width=20%} 
<p class="table-caption" style="text-align:center; font-style:italic;">Figure 2: a smaller image</p>

## Footnote

```markdown
my text that needs footnote[^1]

and on the bottom of the md file: 

[^1]: Put this to the end of the document, the footnote will be listed like this. Rendering will put the footnote on the right page - don't care about that.
```

<span style="color: red;">Rendering:</span>

my text that needs footnote[^1]

and on the bottom of the md file: 

[^1]: Put this to the end of the document, the footnote will be listed like this. Rendering will put the footnote on the right page - don't care about that.

## Tables

```markdown
Table: This is table caption 

| Header1  | header2 | header3  |
|:-|:-|:-|
| cell 1   | cell 2    | cell 3    |
| cell 1   | cell 2    | cell 3    |
| cell 1   | cell 2    | cell 3    |
```

<span style="color: red;">Rendering:</span>

| Header1  | header2 | header3  |
|:-|:-|:-|
| cell 1   | cell 2    | cell 3    |
| cell 1   | cell 2    | cell 3    |
| cell 1   | cell 2    | cell 3    |

<p class="table-caption" style="text-align:center; font-style:italic;">Table 1: This is table caption </p>

> Table Caption numbering is incremented automatically and has a global significance.

More info: [Table in MD](https://tabletomarkdown.com/convert-spreadsheet-to-markdown/)

## List

```markdown
This is a list:

- elem1
- elem2
- elem3
```

<span style="color: red;">Rendering:</span>

This is a list:

- elem1
- elem2
- elem3

## Latex math Formula

One formula: 

```markdown
$$
\frac{10^{6}}{\text{policer clock tick}_{\mu s}} = \frac{10^{6}}{\text{policer tick} \cdot 2^{5R}}
$$
```

<span style="color: red;">Rendering:</span>

$$
\frac{10^{6}}{\text{policer clock tick}_{\mu s}} = \frac{10^{6}}{\text{policer tick} \cdot 2^{5R}}
$$

Need Help?: Go [here](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/writing-mathematical-expressions)

<a id="anchor1"></a> Hello, I'm the anchor1 :-) [Go back to the section](#internal-reference-inside-the-text-body)