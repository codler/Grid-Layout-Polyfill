# Grid Layout Polyfill

Following this spec http://www.w3.org/TR/2012/WD-css3-grid-layout-20120322/ because current IE10 is using that one.

The concept of this polyfill are trying to only change the CSS and not to edit any DOM elements.

* Example of using grid css - http://jsfiddle.net/u6xZF/1/
* Example of the non-grid css - http://jsfiddle.net/Nnjpq/1/

Also the polyfill currently only polyfill the `-ms-` prefix

## How to use

Simply add the script after jQuery

	<script src="grid-layout-polyfill.min.js"></script>

### Options

* `$(grid).gridLayout('refresh')` will recalculate existing initiated grid. Useful when for example you have set a new height with JavaScript on the grid.

	$(grid).gridLayout({
		// Resize event, triggers when window resize with 100ms delay to increase performance
		'resize' : function() {} 
	})

## Browser support

* IE9+ and all other browsers

## Limitation

* IE9: If `display: -ms-grid;` are declared in inline-style, you need to add the attribute `data-ms-grid` on the element, because IE9 removes invalid css value.

### What is covered?

	display: -ms-grid;
	-ms-grid-columns: 100px 1fr auto; /* Only pixel, fraction and auto units */
	-ms-grid-rows: 100px 1fr auto; /* Only pixel, fraction and auto units */

	-ms-grid-column: 1;
	-ms-grid-row: 1;
	-ms-grid-column-span: 1;
	-ms-grid-row-span: 1;