/*! CSS3 Finalize - v1.5 - 2013-04-03 - Grid Layout Polyfill
* https://github.com/codler/Grid-Layout-Polyfill
* Copyright (c) 2013 Han Lin Yap http://yap.nu; http://creativecommons.org/licenses/by-sa/3.0/ */
/* --- Other polyfills --- */
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
if ('function' !== typeof Array.prototype.reduce) {
  Array.prototype.reduce = function(callback, opt_initialValue){
    'use strict';
    if (null === this || 'undefined' === typeof this) {
      // At the moment all modern browsers, that support strict mode, have
      // native implementation of Array.prototype.reduce. For instance, IE8
      // does not support strict mode, so this check is actually useless.
      throw new TypeError(
          'Array.prototype.reduce called on null or undefined');
    }
    if ('function' !== typeof callback) {
      throw new TypeError(callback + ' is not a function');
    }
    var index = 0, length = this.length >>> 0, value, isValueSet = false;
    if (1 < arguments.length) {
      value = opt_initialValue;
      isValueSet = true;
    }
    for ( ; length > index; ++index) {
      if (!this.hasOwnProperty(index)) continue;
      if (isValueSet) {
        value = callback(value, this[index], index, this);
      } else {
        value = this[index];
        isValueSet = true;
      }
    }
    if (!isValueSet) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    return value;
  };
}

/* --- CSS Parser --- */
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

/* --- Grid Layout polyfill --- */
(function($) {
	jQuery(function ($) {

		// Detect grid layout support
		$.support.gridLayout = document.createElement('div').style['msGridRowAlign'] === '';

		if ($.support.gridLayout) {
			$.fn.gridLayout = function() { return this; };
			return false;
		}

		$.fn.gridLayout = function( method ) {

			return this.each(function() {
				var self = this;
				if (method == 'refresh') {
					var stop = false;
					$.each(grids, function(i, block) {
						$(block.selector).each(function() {
							if (self == this) {
								// gridLayout(element, block);


								gl_refresh(self, block);



								stop = true;
								return false;
							}
						});
						if (stop) {
							return false;
						}
					});
				}
			});
		};

		function gl_refresh(ele, block) {
			resetTracks(block.tracks);
			normalizeFractionWidth($(block.selector).outerWidth(), block.tracks);

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
					attributes = $.extend(true, attributes, a);
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

			var height = normalizeFractionHeight($(block.selector).outerHeight(), block.tracks);
			$(block.selector).css({
				height: height
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
					attributes = $.extend(true, attributes, a);
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




		}

		// set back fr-unit
		function resetTracks(tracks) {
			for (var r = 0; r < tracks.length; r++) {
				for (var c = 0; c < tracks[r].length; c++) {
					if (tracks[r][c].frX) {
						tracks[r][c].x = tracks[r][c].frX;
						delete tracks[r][c].frX;
					}

					if (tracks[r][c].frY) {
						tracks[r][c].y = tracks[r][c].frY;
						delete tracks[r][c].frY;
					}
				}
			}
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

		// [data-ms-grid] are for IE9
		$('[style]:has-style("display:-ms-grid"), [data-ms-grid]').each(function () {
			var attr = cssTextAttributeToObj($(this).attr('style'));
			// For ie9
			if (!attr.display) {
				attr.display = '-ms-grid';
			}
			grids.push({
				selector: this,
				attributes: attr,
				tracks: extractTracks(attr)
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
			var cols = attrs['-ms-grid-columns'] || 'auto';
			var rows = attrs['-ms-grid-rows'] || 'auto';
			cols = cols.split(' ');
			rows = rows.split(' ');
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
					attributes = $.extend(true, attributes, a);
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
					attributes = $.extend(true, attributes, a);
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
			var realHeight = normalizeInlineFractionHeight($(block.selector).outerHeight(), block.tracks);
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
					attributes = $.extend(true, attributes, a);
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

		// Resize event
		var resizeTimer;
		$(window).on('resize', function() {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function() {
				$.each(grids, function(i, block) {
					$(block.selector).gridLayout('refresh');
				});
				
			},100);
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
						tracks[r][c].frX = tracks[r][c].x;
						tracks[r][c].x = '' + totalWidthWithoutFractions / (sumFraction / parseFloat(tracks[r][c].x));
					}
				}

			};
		}

		function normalizeFractionHeight(height, tracks) {

			for (var c = 0; c < tracks[0].length; c++) {
				var fractions = [];
				var totalHeightWithoutFractions = height;
				for (var r = 0; r < tracks.length; r++) {
					if (tracks[r][c].y.indexOf('fr') !== -1) {
						fractions.push(parseFloat(tracks[r][c].y));
						//console.log(tracks[r]);
					} else if (tracks[r][c].y.indexOf('px') !== -1) {
						totalHeightWithoutFractions -= parseFloat(tracks[r][c].y);
					}
				}

				// TODO: reduce do not exist in IE8 and lower.
				var sumFraction = fractions.reduce(function(a, b) {
					return parseInt(a, 10) + parseInt(b, 10);
				}, 0);

				for (var r = 0; r < tracks.length; r++) {
					if (tracks[r][c].y.indexOf('fr') !== -1) {
						//console.log(totalHeightWithoutFractions, sumFraction, parseFloat(tracks[r][c].x));
						tracks[r][c].frY = tracks[r][c].y;
						tracks[r][c].y = '' + totalHeightWithoutFractions / (sumFraction / parseFloat(tracks[r][c].y));
					}
				}

			};
		}

		function normalizeInlineFractionHeight(height, tracks) {
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
						tracks[r][c].frY = tracks[r][c].y;
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
			return $.extend(true, {}, found);
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
})(jQuery);