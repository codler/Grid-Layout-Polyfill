/*! Grid Layout Polyfill - v1.8.0 - 2013-04-05 - Polyfill for IE10 grid layout -ms-grid.
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
	if (typeof text != 'string') {
		text = '';
	}
	text = cleanCss(text);

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

function cssObjToText(obj, prettyfy, indentLevel) {
	var text = '';
	prettyfy = prettyfy || false;
	indentLevel = indentLevel || 1; 
	$.each(obj, function(i, block) {
		if (prettyfy) text += Array(indentLevel).join('  ');
		text += block.selector + '{';
		if ($.isArray(block.attributes)) {
			if (prettyfy) text += '\r\n' + Array(indentLevel).join('  ');
			text += $.cssFinalize.cssObjToText(block.attributes, prettyfy, indentLevel+1);
		} else {
			$.each(block.attributes, function(property, value) {
				if (prettyfy) text += '\r\n' + Array(indentLevel + 1).join('  ');
				text += property + ':' + value + ';';
			});
			if (prettyfy) text += '\r\n' + Array(indentLevel).join('  ');
		}
		text += '}';
		if (prettyfy) text += '\r\n';
	});
	return text;
}

function cssObjToTextAttribute(obj, prettyfy, indentLevel) {
	var text = '';
	prettyfy = prettyfy || false;
	indentLevel = indentLevel || 1; 
	$.each(obj, function(property, value) {
		if (prettyfy) text += '\r\n' + Array(indentLevel + 1).join('  ');
		text += property + ':' + value + ';';
	});
	return text;
}

/* --- Grid Layout polyfill --- */
(function($) {
	// Detect grid layout support
	$.support.gridLayout = document.createElement('div').style['msGridRowAlign'] === '';

	// TODO: Low priority: find a better one to detect IE8 and lower
	// IE8 or lower
	var ltIE8 = 'function' !== typeof Array.prototype.reduce;

	if ($.support.gridLayout || ltIE8) {
		$.fn.gridLayout = function() { return this; };
		return;
	}

	function log(o) {
		console.log(o);
	}

	//console.clear();
	
	jQuery(function ($) {

		/**
		 * NOTE: methods and events wont trigger where grid are supported
		 *
		 * Methods: refresh
		 * Events: resize
		 * 
		 * Example usage:
		 * $(grid).gridLayout('refresh')
		 * $(grid).gridLayout({ resize : function(){} })
		 */
		$.fn.gridLayout = function( method ) {
			return this.each(function() {
				var self = this;

				// Method
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

				// TODO: Should this be outside the this.each loop?
				// Events or Options
				} else if (typeof method === 'object') {
					if (method.resize) {
						$(self).on('gridlayoutresize', function() {
							method.resize.call(self);
						});
					}
				}
			});
		};

		function gl_refresh(ele, block) {
			resetTracks(block.tracks);

			var sameHeight = true;
			if ($(block.selector).data('recent-height')) {
				var recentHeight = $(block.selector).data('recent-height');

				if (parseFloat($(block.selector).outerHeight()) != recentHeight) {
					sameHeight = false;

					// Save old style
					$(block.selector).each(function() {
						var gridItem = $(this);

						var selectors = findDefinedSelectors(gridItem);

						// sort specify
						selectors.sort(sortCSSRuleSpecificity);
						
						// TODO: merge all attr to find other same attributes

						var attributes = getAttributesBySelector(objCss, selectors.pop());

						var a = cssTextAttributeToObj(gridItem.data('old-style') || gridItem.attr('style'));
						if (/*a['width'] || */
							a['height']) {
							attributes = $.extend(true, attributes, a);
						}

						var style = cssTextAttributeToObj($(this).attr('style'));
						if (attributes) {
							/*
							if (attributes.width && !style.width) {
								style.width = attributes.width;
							}*/
							if (attributes.height && !style.height) {
								style.height = attributes.height;
							}
						}

						$(this).data('old-style', cssObjToTextAttribute(style));

					});
				}
			}

			var gridSize = calculateTrackSpanLength(block.tracks, 1, 1, block.tracks.length, block.tracks[0].length);
			
			$(block.selector).css({
				'position' : 'relative',
				'box-sizing': 'border-box',
				width: (block.attributes.display == '-ms-grid') ? '100%' : gridSize.x,
				height: gridSize.y
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
				
				// TODO: merge all attr to find other same attributes

				var attributes = getAttributesBySelector(objCss, selectors.pop());

				var a = cssTextAttributeToObj(gridItem.data('old-style') || gridItem.attr('style'));
				if (a['-ms-grid-row'] || 
					a['-ms-grid-column'] || 
					a['-ms-grid-column-span'] ||
					a['-ms-grid-row-span']) {
					attributes = $.extend(true, attributes, a);
				}

				if (!attributes) return true;

				var row = attributes['-ms-grid-row'] || 1;
				var column = attributes['-ms-grid-column'] || 1;
				var columnSpan = attributes['-ms-grid-column-span'] || 1;
				var rowSpan = attributes['-ms-grid-row-span'] || 1;

				var size = calculateTrackSpanLength(block.tracks, row, column, rowSpan, columnSpan);
				var pos = calculateTrackSpanLength(block.tracks, 1, 1, row - 1, column - 1);

				$(this).css({
					//top: pos.y,
					//left: pos.x,
					width: size.x,
					//height: size.y
				})
			})

			normalizeFractionWidth($(block.selector).outerWidth(), block.tracks);


			if (cssTextAttributeToObj($(block.selector).data('old-style')).height) {

				/*var realHeight = */normalizeFractionHeight(parseFloat(cssTextAttributeToObj($(block.selector).data('old-style')).height), block.tracks);
				/*$(block.selector).css({
					height: realHeight
				});*/
			} else {
				var realHeight = normalizeInlineFractionHeight($(block.selector).outerHeight(), block.tracks);
				$(block.selector).css({
					height: realHeight
				});
				$(block.selector).data('recent-height', realHeight);
			}

			$(block.selector).children().each(function (i, e) {
				var gridItem = $(this);

				var selectors = findDefinedSelectors(gridItem);

				// sort specify
				selectors.sort(sortCSSRuleSpecificity);
				
				// TODO: merge all attr to find other same attributes

				var attributes = getAttributesBySelector(objCss, selectors.pop());
				
				var a = cssTextAttributeToObj(gridItem.data('old-style') || gridItem.attr('style'));
				if (a['-ms-grid-row'] || 
					a['-ms-grid-column'] || 
					a['-ms-grid-column-span'] ||
					a['-ms-grid-row-span']) {
					attributes = $.extend(true, attributes, a);
				}

				if (!attributes) return true;

				var row = attributes['-ms-grid-row'] || 1;
				var column = attributes['-ms-grid-column'] || 1;
				var columnSpan = attributes['-ms-grid-column-span'] || 1;
				var rowSpan = attributes['-ms-grid-row-span'] || 1;

				var size = calculateTrackSpanLength(block.tracks, row, column, rowSpan, columnSpan);
				var pos = calculateTrackSpanLength(block.tracks, 1, 1, row - 1, column - 1);

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
		var sumArray = function(arr) {
			return arr.reduce(function(a, b) {
				return parseFloat(a) + parseFloat(b);
			}, 0);
		};

		var styles = $('style').map(function() {
			return $(this).html();
		}).get().join('');

		var objCss = cssTextToObj(styles);
		log(objCss);

		/* { selector, attributes, tracks : ([index-x/row][index-y/col] : { x, y }) } */
		var grids = findGrids(objCss);
		log(grids);

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
			cols = cols.toLowerCase().split(' ');
			rows = rows.toLowerCase().split(' ');
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
					var gridItem = $(this);

					var selectors = findDefinedSelectors(gridItem);

					// sort specify
					selectors.sort(sortCSSRuleSpecificity);
					
					// TODO: merge all attr to find other same attributes

					var attributes = getAttributesBySelector(objCss, selectors.pop());

					var a = cssTextAttributeToObj(gridItem.data('old-style') || gridItem.attr('style'));
					if (a['width'] || 
						a['height']) {
						attributes = $.extend(true, attributes, a);
					}

					var style = cssTextAttributeToObj($(this).attr('style'));
					if (attributes) {
						if (attributes.width && !style.width) {
							style.width = attributes.width;
						}
						if (attributes.height && !style.height) {
							style.height = attributes.height;
						}
					}

					$(this).data('old-style', cssObjToTextAttribute(style));
				}
			});
			
			$(block.selector).css({
				'position' : 'relative',
				'box-sizing': 'border-box',
				width: (block.attributes.display == '-ms-grid') ? '100%' : gridSize.x,
				height: gridSize.y
			});

			

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
				
				// TODO: merge all attr to find other same attributes

				var attributes = getAttributesBySelector(objCss, selectors.pop());

				var a = cssTextAttributeToObj(gridItem.data('old-style') || gridItem.attr('style'));
				if (a['-ms-grid-row'] || a['-ms-grid-column']) {
					attributes = $.extend(true, attributes, a);
				}

				if (!attributes) return true;

				var row = attributes['-ms-grid-row'] || 1;
				var column = attributes['-ms-grid-column'] || 1;
				if (block.tracks[row-1][column-1].item) {
					block.tracks[row-1][column-1].item.add(gridItem);
				} else {
					block.tracks[row-1][column-1].item = gridItem;
				}
			});

			$(block.selector).children().each(function (i, e) {
				var gridItem = $(this);

				var selectors = findDefinedSelectors(gridItem);

				// sort specify
				selectors.sort(sortCSSRuleSpecificity);
				
				// TODO: merge all attr to find other same attributes

				var attributes = getAttributesBySelector(objCss, selectors.pop());

				var a = cssTextAttributeToObj(gridItem.data('old-style') || gridItem.attr('style'));
				if (a['-ms-grid-row'] || 
					a['-ms-grid-column'] || 
					a['-ms-grid-column-span'] ||
					a['-ms-grid-row-span']) {
					attributes = $.extend(true, attributes, a);
				}

				if (!attributes) return true;

				var row = attributes['-ms-grid-row'] || 1;
				var column = attributes['-ms-grid-column'] || 1;
				var columnSpan = attributes['-ms-grid-column-span'] || 1;
				var rowSpan = attributes['-ms-grid-row-span'] || 1;

				var size = calculateTrackSpanLength(block.tracks, row, column, rowSpan, columnSpan);
				var pos = calculateTrackSpanLength(block.tracks, 1, 1, row - 1, column - 1);

				$(this).css({
					//top: pos.y,
					//left: pos.x,
					width: size.x,
					//height: size.y
				})
			})

			/*block.tracks = */normalizeFractionWidth($(block.selector).outerWidth(), block.tracks);

			if (cssTextAttributeToObj($(block.selector).data('old-style')).height) {

				/*var realHeight = */normalizeFractionHeight(parseFloat(cssTextAttributeToObj($(block.selector).data('old-style')).height), block.tracks);
				/*$(block.selector).css({
					height: realHeight
				});*/
			} else {
				var realHeight = normalizeInlineFractionHeight($(block.selector).outerHeight(), block.tracks);
				$(block.selector).css({
					height: realHeight
				});
				$(block.selector).data('recent-height', realHeight);
			}


			$(block.selector).children().each(function (i, e) {
				var gridItem = $(this);

				var selectors = findDefinedSelectors(gridItem);

				// sort specify
				selectors.sort(sortCSSRuleSpecificity);
				
				// TODO: merge all attr to find other same attributes

				var attributes = getAttributesBySelector(objCss, selectors.pop());
				
				var a = cssTextAttributeToObj(gridItem.data('old-style') || gridItem.attr('style'));
				if (a['-ms-grid-row'] || 
					a['-ms-grid-column'] || 
					a['-ms-grid-column-span'] ||
					a['-ms-grid-row-span']) {
					attributes = $.extend(true, attributes, a);
				}

				if (!attributes) return true;

				var row = attributes['-ms-grid-row'] || 1;
				var column = attributes['-ms-grid-column'] || 1;
				var columnSpan = attributes['-ms-grid-column-span'] || 1;
				var rowSpan = attributes['-ms-grid-row-span'] || 1;

				var size = calculateTrackSpanLength(block.tracks, row, column, rowSpan, columnSpan);
				var pos = calculateTrackSpanLength(block.tracks, 1, 1, row - 1, column - 1);

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

		function onResize() {
			$.each(grids, function(i, block) {
				$(block.selector).gridLayout('refresh').trigger('gridlayoutresize');
			});
		}

		function hasVerticalScrollBar() {
			return $(document).height() > $(window).height();
		}

		$(window).on('resize', function(ev, param) {
			var self = this;
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function() {
				var verticalScrollBarVisible = false;
				// Check if vertical scrollbar exist
				if (hasVerticalScrollBar()) { 
					verticalScrollBarVisible = true;
				}

				onResize();

				// Recalculate if verticalscrollbar visibility changed during onResize.
				if (!hasVerticalScrollBar() && verticalScrollBarVisible) {
					$(self).trigger('resize');
				}
			}, 100);
		});

		function normalizeFractionWidth(width, tracks) {
			// Get highest width for each fraction row and normalize each row to 1 in ratio.
			var fractionRowRealWidths = [];
			var autoRowRealWidths = [];
			for (var c = 0; c < tracks[0].length; c++) {
				var fractionMaxRowWidth = [0];
				var autoMaxRowWidth = [0];
				for (var r = 0; r < tracks.length; r++) {
					var rowWidth = 0;
					if (tracks[r][c].x.indexOf('fr') !== -1) {

						var fraction = parseFloat(tracks[r][c].x);

						if (tracks[r][c].item) {
							tracks[r][c].item.width('auto');
							//rowHeight = tracks[r][c].item.outerHeight(true);
							
							// Get max height of all items
							rowWidth = Math.max.apply(Math, tracks[r][c].item.map(function() {
								return $(this).outerWidth(true);
							}).get());
						}

						fractionMaxRowWidth.push(rowWidth / fraction);
					} else if (tracks[r][c].x.indexOf('auto') !== -1) {
						if (tracks[r][c].item) {
							tracks[r][c].item.width('auto');
							//rowHeight = tracks[r][c].item.outerHeight(true);
							
							// Get max height of all items
							rowWidth = Math.max.apply(Math, tracks[r][c].item.map(function() {
								return $(this).outerWidth(true);
							}).get());
						}
						autoMaxRowWidth.push(rowWidth);
					}
				}
				fractionRowRealWidths[c] = Math.max.apply(Math, fractionMaxRowWidth);
				autoRowRealWidths[c] = Math.max.apply(Math, autoMaxRowWidth);
			}
			var rowRealWidth = Math.max.apply(Math, fractionRowRealWidths);

			var fractions = [];
			var availableSpace = width;
			for (var c = 0; c < tracks[0].length; c++) {
				if (tracks[0][c].x.indexOf('fr') !== -1) {
					var fraction = parseFloat(tracks[0][c].x);
					fractions.push(fraction);
				} else if (tracks[0][c].x.indexOf('px') !== -1) {
					availableSpace -= parseFloat(tracks[0][c].x);
				}
			}

			availableSpace -= sumArray(autoRowRealWidths);

			var sumFraction = sumArray(fractions);

			// Convert auto to pixel
			for (var r = 0; r < tracks.length; r++) {
				for (var c = 0; c < tracks[0].length; c++) {
					if (tracks[r][c].x.indexOf('fr') !== -1) {
						tracks[r][c].frX = tracks[r][c].x;
						if (availableSpace > 0) {
							tracks[r][c].x = '' + availableSpace / (sumFraction / parseFloat(tracks[r][c].x));
						} else {
							tracks[r][c].x = '' + 0;
						}
					} else if (tracks[r][c].x.indexOf('auto') !== -1) {
						tracks[r][c].frX = tracks[r][c].x;
						tracks[r][c].x = '' + autoRowRealWidths[c];
					}
				}

			};
		}

		function normalizeFractionHeight(height, tracks) {
			// Get highest height for each fraction row and normalize each row to 1 in ratio.
			var fractionRowRealHeights = [];
			var autoRowRealHeights = [];
			for (var r = 0; r < tracks.length; r++) {
				var fractionMaxRowHeight = [0];
				var autoMaxRowHeight = [0];
				for (var c = 0; c < tracks[0].length; c++) {
					var rowHeight = 0;
					if (tracks[r][c].y.indexOf('fr') !== -1) {

						var fraction = parseFloat(tracks[r][c].y);

						if (tracks[r][c].item) {
							tracks[r][c].item.height('auto');
							//rowHeight = tracks[r][c].item.outerHeight(true);
							
							// Get max height of all items
							rowHeight = Math.max.apply(Math, tracks[r][c].item.map(function() {
								return $(this).outerHeight(true);
							}).get());
						}

						fractionMaxRowHeight.push(rowHeight / fraction);
					} else if (tracks[r][c].y.indexOf('auto') !== -1) {
						if (tracks[r][c].item) {
							tracks[r][c].item.height('auto');
							//rowHeight = tracks[r][c].item.outerHeight(true);
							
							// Get max height of all items
							rowHeight = Math.max.apply(Math, tracks[r][c].item.map(function() {
								return $(this).outerHeight(true);
							}).get());
						}
						autoMaxRowHeight.push(rowHeight);
					}
				}
				fractionRowRealHeights[r] = Math.max.apply(Math, fractionMaxRowHeight);
				autoRowRealHeights[r] = Math.max.apply(Math, autoMaxRowHeight);
			}
			var rowRealHeight = Math.max.apply(Math, fractionRowRealHeights);

			var fractions = [];
			var availableSpace = height;
			for (var r = 0; r < tracks.length; r++) {
				if (tracks[r][0].y.indexOf('fr') !== -1) {
					var fraction = parseFloat(tracks[r][0].y);
					fractions.push(fraction);
				} else if (tracks[r][0].y.indexOf('px') !== -1) {
					availableSpace -= parseFloat(tracks[r][0].y);
				}
			}

			availableSpace -= sumArray(autoRowRealHeights);

			var sumFraction = sumArray(fractions);

			// Convert auto to pixel
			for (var c = 0; c < tracks[0].length; c++) {
				for (var r = 0; r < tracks.length; r++) {
					if (tracks[r][c].y.indexOf('fr') !== -1) {
						tracks[r][c].frY = tracks[r][c].y;
						if (availableSpace > 0) {
							tracks[r][c].y = '' + availableSpace / (sumFraction / parseFloat(tracks[r][c].y));
						} else {
							tracks[r][c].y = '' + 0;
						}
					} else if (tracks[r][c].y.indexOf('auto') !== -1) {
						tracks[r][c].frY = tracks[r][c].y;
						tracks[r][c].y = '' + autoRowRealHeights[r];
					}
				}

			};

		}

		function normalizeInlineFractionHeight(height, tracks) {
			// Get highest height for each fraction row and normalize each row to 1 in ratio.
			var fractionRowRealHeights = [];
			var autoRowRealHeights = [];
			for (var r = 0; r < tracks.length; r++) {
				var fractionMaxRowHeight = [0];
				var autoMaxRowHeight = [0];
				for (var c = 0; c < tracks[0].length; c++) {
					var rowHeight = 0;
					if (tracks[r][c].y.indexOf('fr') !== -1) {

						var fraction = parseFloat(tracks[r][c].y);

						if (tracks[r][c].item) {
							tracks[r][c].item.height('auto');
							//rowHeight = tracks[r][c].item.outerHeight(true);
							
							// Get max height of all items
							rowHeight = Math.max.apply(Math, tracks[r][c].item.map(function() {
								return $(this).outerHeight(true);
							}).get());
						}

						fractionMaxRowHeight.push(rowHeight / fraction);
					} else if (tracks[r][c].y.indexOf('auto') !== -1) {
						if (tracks[r][c].item) {
							tracks[r][c].item.height('auto');
							//rowHeight = tracks[r][c].item.outerHeight(true);
							
							// Get max height of all items
							rowHeight = Math.max.apply(Math, tracks[r][c].item.map(function() {
								return $(this).outerHeight(true);
							}).get());
						}
						autoMaxRowHeight.push(rowHeight);
					}
				}
				fractionRowRealHeights[r] = Math.max.apply(Math, fractionMaxRowHeight);
				autoRowRealHeights[r] = Math.max.apply(Math, autoMaxRowHeight);
			}
			var rowRealHeight = Math.max.apply(Math, fractionRowRealHeights);


			var fractions = [];
			// Sum all px
			var totalHeightWithoutFractions = height;
			// Sum all real height fractions in px
			var totalRealHeightFractions = 0;
			var totalRealHeightAuto = 0;
			for (var r = 0; r < tracks.length; r++) {
				if (tracks[r][0].y.indexOf('fr') !== -1) {
					var fraction = parseFloat(tracks[r][0].y);
					fractions.push(fraction);
					totalRealHeightFractions += rowRealHeight * fraction;
				} else if (tracks[r][0].y.indexOf('px') !== -1) {
					totalHeightWithoutFractions -= parseFloat(tracks[r][0].y);
				} else if (tracks[r][0].y.indexOf('auto') !== -1) {
					totalRealHeightAuto += autoRowRealHeights[r];
				}
			}
			totalHeightWithoutFractions += totalRealHeightFractions;

			var sumFraction = sumArray(fractions);

			// Convert fraction to pixel
			for (var c = 0; c < tracks[0].length; c++) {
				for (var r = 0; r < tracks.length; r++) {
					if (tracks[r][c].y.indexOf('fr') !== -1) {
						tracks[r][c].frY = tracks[r][c].y;
						tracks[r][c].y = '' + totalHeightWithoutFractions / (sumFraction / parseFloat(tracks[r][c].y));
					} else if (tracks[r][c].y.indexOf('auto') !== -1) {
						tracks[r][c].frY = tracks[r][c].y;
						tracks[r][c].y = '' + autoRowRealHeights[r];
					}
				}

			};

			return height + totalRealHeightFractions + totalRealHeightAuto;
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
				/*
				if ((/^\d+(\.\d+)?(px)?$/.test(tracks[row + r][column].y)) != (tracks[row + r][column].y.indexOf('fr') === -1)) {
					console.log('---------------------------------------');
					console.log(tracks[row + r][column].y);
				}*/
				if (/^\d+(\.\d+)?(px)?$/.test(tracks[row + r][column].y)) {
					length.y += parseFloat(tracks[row + r][column].y);
				}
			}
			for (var c = 0; c < columnSpan; c++) {
				// TODO calc "fr"-unit
				/*
				if ((/^\d+(\.\d+)?(px)?$/.test(tracks[row][column + c].x)) != (tracks[row][column + c].x.indexOf('fr') === -1)) {
					console.log('---------------------------------------');
					console.log(tracks[row][column + c].x);
				}*/
				if (/^\d+(\.\d+)?(px)?$/.test(tracks[row][column + c].x)) {
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