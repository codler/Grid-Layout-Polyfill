/*! CSS3 Finalize - v1.3 - 2013-03-27 - Grid Layout Polyfill
* https://github.com/codler/Grid-Layout-Polyfill
* Copyright (c) 2013 Han Lin Yap http://yap.nu; http://creativecommons.org/licenses/by-sa/3.0/ */
// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());
if (!Array.prototype.reduce) {

	Array.prototype.reduce = function(callbackfn /*, initialValue */) {

		// step 1
		if (this == null) {
			throw new TypeError("can't convert " + this + " to object");
		}
		var O = Object(this);

		// steps 2 & 3
		var len = O.length >>> 0;

		// step 4
		if (typeof callbackfn != "function") {
			throw new TypeError(callbackfn + " is not a function");
		}

		// step 5
		if (len === 0 && arguments.length < 2) {
			throw new TypeError('reduce of empty array with no initial value');
		}
	
		// step 6
		var k = 0;

		// step 7
		var accumulator;
		if (arguments.length > 1) {
			accumulator = arguments[1];
		}
		// step 8
		else {
			var kPresent = false;
			while ((!kPresent) && (k < len)) {
				kPresent = k in O;
				if (kPresent) {
					accumulator = O[k];
				}
				k++;
			}
			if (!kPresent) {
				throw new TypeError('reduce of empty array with no initial value');
			}
		}

		// step 9
		while (k < len) {
			if (k in O) {
				accumulator = callbackfn.call(undefined, accumulator, O[k], k, O);
			}
			k++;
		}
	
		// step 10
		return accumulator;
	};

}

function cleanCss(css) {
	// strip multiline comment
	css = css.replace(/\/\*((?:[^\*]|\*[^\/])*)\*\//g, '');

	// remove newline
	css = css.replace(/\n/g, '');
	css = css.replace(/\r/g, '');

	// remove @import - Future TODO read if css was imported and parse it.
	css = css.replace(/\@import[^;]*;/g, '');

	return css;
}

function cssTextToObj(text) {
	text = cleanCss(text);
	var block = text.split(/({[^{}]*})/);

	// fixes recursive block at end
	if (block[block.length - 1].indexOf('}') == -1) {
		block.pop();
	}
	var objCss = [];
	var recusiveBlock = false;
	var t;
	var tt = 0;
	var ttt;
	var i = 0;
	while (i < block.length) {
		if (i % 2 === 0) {
			var selector = $.trim(block[i]);
			if (recusiveBlock) {
				if (selector.indexOf('}') != -1) {
					selector = selector.substr(1);
					block[i] = selector;

					ttt = block.splice(tt, i - tt);
					ttt.shift();
					ttt.unshift(t[1]);
					objCss[objCss.length - 1].attributes = cssTextToObj(ttt.join(''));
					recusiveBlock = false;
					i = tt;
					continue;
				}
			} else {

				if (selector.indexOf('{') != -1) {
					t = selector.split('{');
					selector = $.trim(t[0]);
					recusiveBlock = true;
					tt = i;
				}
				if (selector !== "") {
					objCss.push({
						'selector': selector
					});
				}
			}
		} else {
			if (!recusiveBlock) {
				objCss[objCss.length - 1].attributes = cssTextAttributeToObj(block[i].substr(1, block[i].length - 2));
			}
		}
		i++;
	}
	return objCss;
}

function cssTextAttributeToObj(text) {
	text = cleanCss(text || '');

	// Data URI fix
	var attribute;
	text = text.replace(/url\(([^)]+)\)/g, function (url) {
		return url.replace(/;/g, '[cssFinalize]');
	});
	attribute = text.split(/(:[^;]*;?)/);

	attribute.pop();
	var objAttribute = {};
	$.map(attribute, function (n, i) {
		if (i % 2 == 1) {
			objAttribute[$.trim(attribute[i - 1])] = $.trim(n.substr(1).replace(';', '').replace(/url\(([^)]+)\)/g, function (url) {
				return url.replace(/\[cssFinalize\]/g, ';');
			}));
		}
	});
	return objAttribute;
}

jQuery(function ($) {

	if (document.createElement('div').style['msGridRowAlign'] === '') {
		return false;
	}

	var reSelectorTag = /(^|\s)(?:\w+)/g;
	var reSelectorClass = /\.[\w\d_-]+/g;
	var reSelectorId = /#[\w\d_-]+/g;
	var getCSSRuleSpecificity = function (selector) {
		var match = selector.match(reSelectorTag);
		var tagCount = match ? match.length : 0;

		match = selector.match(reSelectorClass);
		var classCount = match ? match.length : 0;

		match = selector.match(reSelectorId);
		var idCount = match ? match.length : 0;

		return tagCount + 10 * classCount + 100 * idCount;
	};
	var sortCSSRuleSpecificity = function(a, b) {
		a = getCSSRuleSpecificity(a)
		b = getCSSRuleSpecificity(b)
		if (a < b) {
			 return -1; 
		} else if(a > b) {
			 return 1;  
		} else {
			 return 0;   
		}
	};

	console.clear();

	var styles = $('style').map(function() {
		return $(this).html();
	}).get().join('');

	var objCss = cssTextToObj(styles);
	console.log(objCss);

	/* { selector, attributes, tracks : ([index-x/row][index-y/col] : { x, y }) } */
	var grids = findGrids(objCss);
	console.log(grids);

	$.expr[":"]['has-style'] = $.expr.createPseudo(function(arg) {
		return function( elem ) {

			var a = cssTextAttributeToObj($(elem).attr('style'));
			var b = cssTextAttributeToObj(arg);
			var match = false;
			$.each(a, function(key, value) {
				$.each(b, function(key2, value2) {
					if (key == key2 && value == value2) {
						match = true;
						return false;
					}
				});
				if (match) {
					return false;
				}
			});
			return match;
		};
	});

	$('[style]:has-style("display:-ms-grid")').each(function () {
		grids.push({
			selector: this,
			attributes: cssTextAttributeToObj($(this).attr('style')),
			tracks: extractTracks(cssTextAttributeToObj($(this).attr('style')))
		});
	});










	function findGrids(objCss) {
		var grids = [];
		$.each(objCss, function (i, block) {
			if (block.attributes) {
				if (block.attributes.display == '-ms-grid') {
					grids.push({
						selector: block.selector,
						attributes: block.attributes,
						tracks: extractTracks(block.attributes)
					});

					//grids.push(block);
				}
			}
		});
		return grids;
	}

	function extractTracks(attrs) {
		var cols = attrs['-ms-grid-columns'].split(' '),
			rows = attrs['-ms-grid-rows'].split(' ');
		var tracks = [];
		$.each(rows, function (x, rv) {
			tracks[x] = [];
			$.each(cols, function (y, cv) {
				tracks[x][y] = {
					x: cv,
					y: rv
				}
			});
		})
		return tracks;
	}

	// apply css
	$.each(grids, function (i, block) {
		var gridSize = calculateTrackSpanLength(block.tracks, 1, 1, block.tracks.length, block.tracks[0].length);
		
		// Save old style
		$(block.selector).each(function() {
			if (!$(this).data('old-style')) {
				$(this).data('old-style', $(this).attr('style'));
			}
		});
		
		$(block.selector).css({
			'position' : 'relative',
			'box-sizing': 'border-box',
			width: (block.attributes.display == '-ms-grid') ? '100%' : gridSize.x,
			height: gridSize.y
		});

		/*block.tracks = */normalizeFractionWidth($(block.selector).outerWidth(), block.tracks);
		

		console.log($(block.selector).outerWidth());
		console.log($(block.selector).outerHeight());
		console.log(block.tracks);

		// Save old style
		$(block.selector).children().each(function() {
			if (!$(this).data('old-style')) {
				$(this).data('old-style', $(this).attr('style'));
			}
		});

		$(block.selector).children().css({
			'box-sizing': 'border-box',
				'position': 'absolute',
			top: 0,
			left: 0,
			width: block.tracks[0][0].x,
			height: block.tracks[0][0].y
		}).each(function (i, e) {
			var gridItem = $(this);

			var selectors = findDefinedSelectors(gridItem);

			// sort specify
			selectors.sort(sortCSSRuleSpecificity);
			console.log(selectors);
			// TODO: merge all attr to find other same attributes

			var attributes = getAttributesBySelector(objCss, selectors.pop());

			var a = cssTextAttributeToObj(gridItem.data('old-style') || gridItem.attr('style'));
			if (a['-ms-grid-row'] || attributes['-ms-grid-column']) {
				attributes = $.extend(attributes, a);
			}

			if (!attributes) return true;

			var row = attributes['-ms-grid-row'] || 1;
			var column = attributes['-ms-grid-column'] || 1;

			block.tracks[row-1][column-1].item = gridItem;
		});

		$(block.selector).children().css({
			'box-sizing': 'border-box',
				'position': 'absolute',
			top: 0,
			left: 0,
			width: block.tracks[0][0].x,
			height: block.tracks[0][0].y
		}).each(function (i, e) {
			var gridItem = $(this);

			var selectors = findDefinedSelectors(gridItem);

			// sort specify
			selectors.sort(sortCSSRuleSpecificity);
			console.log(selectors);
			// TODO: merge all attr to find other same attributes

			var attributes = getAttributesBySelector(objCss, selectors.pop());

			var a = cssTextAttributeToObj(gridItem.data('old-style') || gridItem.attr('style'));
			if (a['-ms-grid-row'] || 
				attributes['-ms-grid-column'] || 
				attributes['-ms-grid-column-span'] ||
				attributes['-ms-grid-row-span']) {
				attributes = $.extend(attributes, a);
			}

			if (!attributes) return true;

			var row = attributes['-ms-grid-row'] || 1;
			var column = attributes['-ms-grid-column'] || 1;
			var columnSpan = attributes['-ms-grid-column-span'] || 1;
			var rowSpan = attributes['-ms-grid-row-span'] || 1;

			var size = calculateTrackSpanLength(block.tracks, row, column, rowSpan, columnSpan);
			var pos = calculateTrackSpanLength(block.tracks, 1, 1, row - 1, column - 1);
			console.log(row, column, columnSpan, rowSpan);
			console.log(size);
			console.log(pos);

			$(this).css({
				//top: pos.y,
				//left: pos.x,
				width: size.x,
				//height: size.y
			})
		})
		var realHeight = normalizeFractionHeight($(block.selector).outerHeight(), block.tracks);
		$(block.selector).css({
			height: realHeight
		});


		$(block.selector).children().each(function (i, e) {
			var gridItem = $(this);

			var selectors = findDefinedSelectors(gridItem);

			// sort specify
			selectors.sort(sortCSSRuleSpecificity);
			console.log(selectors);
			// TODO: merge all attr to find other same attributes

			var attributes = getAttributesBySelector(objCss, selectors.pop());
			
			var a = cssTextAttributeToObj(gridItem.data('old-style') || gridItem.attr('style'));
			if (a['-ms-grid-row'] || 
				attributes['-ms-grid-column'] || 
				attributes['-ms-grid-column-span'] ||
				attributes['-ms-grid-row-span']) {
				attributes = $.extend(attributes, a);
			}

			if (!attributes) return true;

			var row = attributes['-ms-grid-row'] || 1;
			var column = attributes['-ms-grid-column'] || 1;
			var columnSpan = attributes['-ms-grid-column-span'] || 1;
			var rowSpan = attributes['-ms-grid-row-span'] || 1;

			var size = calculateTrackSpanLength(block.tracks, row, column, rowSpan, columnSpan);
			var pos = calculateTrackSpanLength(block.tracks, 1, 1, row - 1, column - 1);
			console.log(row, column, columnSpan, rowSpan);
			console.log(size);
			console.log(pos);
			$(this).css({
				top: pos.y,
				left: pos.x,
				width: size.x,
				height: size.y
			})
		});
		
	});

	function normalizeFractionWidth(width, tracks) {

		for (var r = 0; r < tracks.length; r++) {
			var fractions = [];
			var totalWidthWithoutFractions = width;
			for (var c = 0; c < tracks[r].length; c++) {
				if (tracks[r][c].x.indexOf('fr') !== -1) {
					fractions.push(parseFloat(tracks[r][c].x));
					//console.log(tracks[r]);
				} else if (tracks[r][c].x.indexOf('px') !== -1) {
					totalWidthWithoutFractions -= parseFloat(tracks[r][c].x);
				}
			}

			// TODO: reduce do not exist in IE8 and lower.
			var sumFraction = fractions.reduce(function(a, b) {
				return parseInt(a, 10) + parseInt(b, 10);
			}, 0);

			for (var c = 0; c < tracks[r].length; c++) {
				if (tracks[r][c].x.indexOf('fr') !== -1) {
					//console.log(totalWidthWithoutFractions, sumFraction, parseFloat(tracks[r][c].x));
					tracks[r][c].x = '' + totalWidthWithoutFractions / (sumFraction / parseFloat(tracks[r][c].x));
				}
			}

		};
	}

	function normalizeFractionHeight(height, tracks) {
		var realHeight = height;
		var readRealHeight = false

		for (var c = 0; c < tracks[0].length; c++) {
			var fractions = [];
			var totalHeightWithoutFractions = height;
			for (var r = 0; r < tracks.length; r++) {
				if (tracks[r][c].y.indexOf('fr') !== -1) {
					fractions.push(parseFloat(tracks[r][c].y));
					//tracks[r][c].fractionY = parseFloat(tracks[r][c].y);
					if (tracks[r][c].item) {
						tracks[r][c].item.height('auto');
						totalHeightWithoutFractions += tracks[r][c].item.outerHeight(true);
						if (!readRealHeight) {
							realHeight += tracks[r][c].item.outerHeight(true);
							readRealHeight = true;
						}
					}
					//console.log(tracks[r]);
				} else if (tracks[r][c].y.indexOf('px') !== -1) {
					console.log(tracks[r][c].y);
					totalHeightWithoutFractions -= parseFloat(tracks[r][c].y);
				}
			}

			// TODO: reduce do not exist in IE8 and lower.
			var sumFraction = fractions.reduce(function(a, b) {
				return parseInt(a, 10) + parseInt(b, 10);
			}, 0);

			for (var r = 0; r < tracks.length; r++) {
				if (tracks[r][c].y.indexOf('fr') !== -1) {
					console.log(totalHeightWithoutFractions, sumFraction, parseFloat(tracks[r][c].y));
					tracks[r][c].y = '' + totalHeightWithoutFractions / (sumFraction / parseFloat(tracks[r][c].y));
				}
			}

		};
		return realHeight;
	}

	function getAttributesBySelector(objCss, selector) {
		var found;
		$.each(objCss, function (i, block) {
			if (block.selector == selector) {
				found = block.attributes;
				return false;
			}
		})
		return found;
	}

	function calculateTrackSpanLength(tracks, row, column, rowSpan, columnSpan) {
		row--;
		column--;
		var length = {
			x: 0,
			y: 0
		};
		for (var r = 0; r < rowSpan; r++) {
			// TODO calc "fr"-unit
			if (tracks[row + r][column].y.indexOf('fr') === -1) {
				length.y += parseFloat(tracks[row + r][column].y);
			}
		}
		for (var c = 0; c < columnSpan; c++) {
			// TODO calc "fr"-unit
			if (tracks[row][column + c].x.indexOf('fr') === -1) {
				length.x += parseFloat(tracks[row][column + c].x);
			}

		}
		return length;
	}

	function findDefinedSelectors(element) {
		var selectors = [];
		for (var x = 0; x < document.styleSheets.length; x++) {
			var rules = document.styleSheets[x].cssRules;
			for (var i = 0; i < rules.length; i++) {

				try {
					if (element.is(rules[i].selectorText)) {
						selectors.push(rules[i].selectorText);
					}
				} catch (e) {}
			}
		}
		return selectors;
	}
});