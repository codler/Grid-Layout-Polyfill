/*! Grid Layout Polyfill - v1.22.0 - 2014-04-01 - Polyfill for IE10 grid layout -ms-grid.
* https://github.com/codler/Grid-Layout-Polyfill
* Copyright (c) 2014 Han Lin Yap http://yap.nu; MIT license */
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

/* --- CSS Analyzer --- */
(function(){
	var styleSheets = document.styleSheets;
	var cacheFindDefinedSelectorsKey = [];
	var cacheFindDefinedSelectors = [];
	var reSelectorTag = /(^|\s)(?:\w+)/g;
	var reSelectorClass = /\.[\w\d_-]+/g;
	var reSelectorId = /#[\w\d_-]+/g;

	var self = CSSAnalyzer = {
		specificity: function(selector) {
			var match = selector.match(reSelectorTag);
			var tagCount = match ? match.length : 0;

			match = selector.match(reSelectorClass);
			var classCount = match ? match.length : 0;

			match = selector.match(reSelectorId);
			var idCount = match ? match.length : 0;

			return tagCount + 10 * classCount + 100 * idCount;
		},

		/**
		 * Highest specificity at end
		 */
		sortSpecificity: function(a, b) {
			if (a.specificity < b.specificity) {
				 return -1; 
			} else if(a.specificity > b.specificity) {
				 return 1;  
			} else {
				 return 0;   
			}
		},

		each: function(obj, callback) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					callback.call(obj, key, obj[key]);
				}
			}
		},

		indexOf: function(array, item) {
			if (array == null) return -1;
			var i = 0, l = array.length;
			for (; i < l; i++) if (array[i] === item) return i;
			return -1;
		},

		trim: function(text) {
			return (text == null) ? '' : ''.trim.call(text);
		},

		/**
		 * @param text string
		 * @return string
		 */
		clean: function(text) {
			if (typeof text !== 'string') return '';

			// strip multiline comment
			text = text.replace(/\/\*((?:[^\*]|\*[^\/])*)\*\//g, '');

			// remove newline
			text = text.replace(/\n/g, '');
			text = text.replace(/\r/g, '');

			// remove @import - Future TODO read if css was imported and parse it.
			text = text.replace(/\@import[^;]*;/g, '');

			return text;
		},

		textToObj: function(text) {
			text = self.clean(text);
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
					var selector = self.trim(block[i]);
					if (recusiveBlock) {
						if (selector.indexOf('}') != -1) {
							selector = selector.substr(1);
							block[i] = selector;

							ttt = block.splice(tt, i - tt);
							ttt.shift();
							ttt.unshift(t[1]);
							objCss[objCss.length - 1].attributes = self.textToObj(ttt.join(''));
							recusiveBlock = false;
							i = tt;
							continue;
						}
					} else {

						if (selector.indexOf('{') != -1) {
							t = selector.split('{');
							selector = self.trim(t[0]);
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
						objCss[objCss.length - 1].attributes = self.textAttrToObj(block[i].substr(1, block[i].length - 2));
					}
				}
				i++;
			}
			return objCss;
		},

		textAttrToObj: function(text) {
			text = self.clean(text);
			if (!text) return {};

			// Data URI fix
			var attribute;
			text = text.replace(/url\(([^)]+)\)/g, function (url) {
				return url.replace(/;/g, '[CSSAnalyzer]');
			});
			attribute = text.split(/(:[^;]*;?)/);

			attribute.pop();
			var objAttribute = {};
			for(var i = 0, l = attribute.length; i < l; i++) {
				if (i % 2 == 1) {
					var property = self.trim(attribute[i - 1]);
					var value = attribute[i];
					objAttribute[property] = self.trim(value.substr(1).replace(';', '').replace(/url\(([^)]+)\)/g, function (url) {
						return url.replace(/\[CSSAnalyzer\]/g, ';');
					}));
				}
			}
			return objAttribute;
		},

		/**
		 * @param obj Array
		 */
		objToText: function(obj, prettyfy, indentLevel) {
			var text = '';
			prettyfy = prettyfy || false;
			indentLevel = indentLevel || 1; 
			obj.forEach(function(block) {
				if (prettyfy) text += Array(indentLevel).join('  ');
				text += block.selector + '{';
				if (Array.isArray(block.attributes)) {
					if (prettyfy) text += '\r\n' + Array(indentLevel).join('  ');
					text += self.objToText(block.attributes, prettyfy, indentLevel+1);
				} else {
					self.each(block.attributes, function(property, value) {
						if (prettyfy) text += '\r\n' + Array(indentLevel + 1).join('  ');
						text += property + ':' + value + ';';
					});
					if (prettyfy) text += '\r\n' + Array(indentLevel).join('  ');
				}
				text += '}';
				if (prettyfy) text += '\r\n';
			});
			return text;
		},

		objToTextAttr: function(obj, prettyfy, indentLevel) {
			var text = '';
			prettyfy = prettyfy || false;
			indentLevel = indentLevel || 1; 
			self.each(obj, function(property, value) {
				if (prettyfy) text += '\r\n' + Array(indentLevel + 1).join('  ');
				text += property + ':' + value + ';';
			});
			return text;
		},

		/**
		 * @param element DOM element
		 * TODO: Should get all raw css text like css3finalize and replace stylesheets?
		 * TODO: Handle media queries
		 * TODO: Handle external stylesheets, they return null
		 * TODO: Handle scope (document, iframe)
		 * @return [{selector:string, specificity:int}] order by specificity asc
		 */
		findDefinedSelectors: function(element) {
			var i;
			// Check if exists in cache
			if ((i = cacheFindDefinedSelectorsKey.indexOf(element)) !== -1) {
				// slice(0) is for "pass-by-value"
				return cacheFindDefinedSelectors[i].slice(0);
			}
			var selectors = [];
			// Loop through all styles and selectors
			for (var x = 0, ssl = styleSheets.length; x < ssl; x++) {
				var rules = styleSheets[x].cssRules;
				if (rules) {
					for (var i = 0, rl = rules.length; i < rl; i++) {
						// TODO: document why try-catch is here
						try {
							// Check if selector match element
							if (self.indexOf(document.querySelectorAll(rules[i].selectorText), element) !== -1) {
								selectors.push({
									selector: rules[i].selectorText
									,specificity: self.specificity(rules[i].selectorText)
								});
							}
						} catch (e) {}
					}
				}
			}

			selectors.sort(self.sortSpecificity);

			// Save to cache
			cacheFindDefinedSelectorsKey.push(element);
			cacheFindDefinedSelectors.push(selectors);

			return selectors.slice(0);
		}
	}
})();

/* --- Grid Layout polyfill --- */
(function($) {
	// Prevent to read twice
	if ($.gridLayout) {
		return;
	}

	// Detect grid layout support
	$.support.gridLayout = document.createElement('div').style['msGridRowAlign'] === '';
	/*
	// TODO: replace with this.
	var div = document.createElement('div');
	// TODO: webkit
	div.style.display = '-ms-grid';
	$.support.gridLayout = div.style.display === '-ms-grid';
	*/

	// TODO: Low priority: find a better one to detect IE8 and lower
	// IE8 or lower
	var ltIE8 = 'function' !== typeof Array.prototype.reduce;
	var cacheGetDefinedAttributesByElementKey = [];
	var cacheGetDefinedAttributesByElement = [];

	if ($.support.gridLayout || ltIE8) {
		$.fn.gridLayout = function() { return this; };
		$.gridLayout = $.noop();
		return;
	}

	var log = console.log.bind(console);

	var grids = []; // List of all grids

	$.gridLayout = function(method) {
		// Internal usage
		if (method == 'clearCache') {
			// TODO: remove and use CSSAnalyzer instead
			cacheFindDefinedSelectorsKey = [];
			cacheFindDefinedSelectors = [];

			cacheGetDefinedAttributesByElementKey = [];
			cacheGetDefinedAttributesByElement = [];
		} else {
			// Return all grids;
			return grids;
		}
	};

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
								if (!block.hasInit) {
									init(objCss, block);
								}
								
								// gridLayout(element, block);
								resetTracks(block.tracks);

								var sameHeight = true;
								if ($(block.selector).data('recent-height')) {
									var recentHeight = $(block.selector).data('recent-height');

									if (parseFloat($(block.selector).outerHeight()) != recentHeight) {
										sameHeight = false;

										// Save old style
										$(block.selector).each(function() {
											var gridItem = $(this);

											var attributes = getDefinedAttributesByElement(objCss, gridItem, CSSAnalyzer.textAttrToObj(gridItem.data('old-style')));

											var style = CSSAnalyzer.textAttrToObj($(this).attr('style'));
											/*
											if (attributes.width && !style.width) {
												style.width = attributes.width;
											}*/
											if (attributes.height && !style.height) {
												style.height = attributes.height;
											}

											$(this).data('old-style', CSSAnalyzer.objToTextAttr(style));

										});
									}
								}

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

			var gridSizeYInitState = $(block.selector).outerHeight();
			var gridSize = calculateTrackSpanLength(block.tracks, 1, 1, block.tracks.length, block.tracks[0].length);
			
			$(block.selector).css({
				'position' : 'relative',
				'box-sizing': 'border-box',
				width: (block.attributes.display == '-ms-grid' || block.attributes.display == 'grid') ? 'auto' : gridSize.x,
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

				var attributes = getDefinedAttributesByElement(objCss, gridItem, CSSAnalyzer.textAttrToObj(gridItem.data('old-style')));

				var row = attributes['-ms-grid-row'] || 1;
				var column = attributes['-ms-grid-column'] || 1;
				var columnSpan = attributes['-ms-grid-column-span'] || 1;
				var rowSpan = attributes['-ms-grid-row-span'] || 1;

				var size = calculateTrackSpanLength(block.tracks, row, column, rowSpan, columnSpan);
				var pos = calculateTrackSpanLength(block.tracks, 1, 1, row - 1, column - 1);

				$(this).css({
					width: size.x
				});
			});

			normalizeFractionWidth($(block.selector).outerWidth(), block.tracks);

			var oldStyle = CSSAnalyzer.textAttrToObj($(block.selector).data('old-style'));
			if (oldStyle.height && /^\d+(\.\d+)?px$/.test(oldStyle.height)) {

				var realHeight = normalizeFractionHeight(parseFloat(oldStyle.height), block.tracks);
				$(block.selector).css({
					height: realHeight
				});
				$(block.selector).data('recent-height', realHeight);
				
			} else if (oldStyle.height && /^\d+(\.\d+)?%$/.test(oldStyle.height)) {

				// Get all grids in current grid
				var childGrids = grids.filter(function(grid) {
					return !!$(block.selector).has(grid.selector).length;
				});
				
				// Temporary set height to auto then refresh grid layout on those children
				childGrids.forEach(function(grid) {
					var gridItem = $(grid.selector);
					var attributes = getDefinedAttributesByElement(objCss, gridItem, CSSAnalyzer.textAttrToObj(gridItem.data('old-style')));
					
					grid.oldAttributes = attributes;
					
					$(grid.selector).height('auto');
					
					if (!grid.hasInit) {
						$(grid.selector).gridLayout('refresh');
					}
				});
				
				// Normalize
				var realHeight = normalizeFractionHeight(gridSizeYInitState * parseFloat(oldStyle.height)/100, block.tracks);
				realHeight = Math.min(realHeight, gridSizeYInitState * parseFloat(oldStyle.height)/100/*, realAutoHeight*/);
				$(block.selector).css({
					height: realHeight
				});
				$(block.selector).data('recent-height', realHeight);
				
				// Set back to original height
				childGrids.forEach(function(grid) {
					var height = grid.oldAttributes.height;
					
					$(grid.selector).height(height);
				});

			} else {
				var realHeight = normalizeInlineFractionHeight($(block.selector).outerHeight(), block.tracks);
				$(block.selector).css({
					height: realHeight
				});
				$(block.selector).data('recent-height', realHeight);
			}

			$(block.selector).children().each(function (i, e) {
				var gridItem = $(this);

				var attributes = getDefinedAttributesByElement(objCss, gridItem, CSSAnalyzer.textAttrToObj(gridItem.data('old-style')));

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
				});
			});

		}

		// set back fr-unit
		function resetTracks(tracks) {
			for (var r = 0; r < tracks.length; r++) {
				for (var c = 0; c < tracks[r].length; c++) {
					if (tracks[r][c].frX) {
						if (validateValue(tracks[r][c].frX)) {
							tracks[r][c].x = tracks[r][c].frX;
							delete tracks[r][c].frX;
						} else {
							log('Invalid value have been inserted to the grid layout');
						}
					}

					if (tracks[r][c].frY) {
						if (validateValue(tracks[r][c].frY)) {
							tracks[r][c].y = tracks[r][c].frY;
							delete tracks[r][c].frY;
						} else {
							log('Invalid value have been inserted to the grid layout');
						}
					}
				}
			}
		}

		var sumArray = function(arr) {
			return arr.reduce(function(a, b) {
				return parseFloat(a) + parseFloat(b);
			}, 0);
		};

		var styles = $('style').map(function() {
			return $(this).html();
		}).get().join('');

		var objCss = CSSAnalyzer.textToObj(styles);

		/* { selector, attributes, tracks : ([index-x/row][index-y/col] : { x, y }) } */
		grids = findGrids(objCss);
		

		$.expr[":"]['has-style'] = $.expr.createPseudo(function(arg) {
			return function( elem ) {

				var a = CSSAnalyzer.textAttrToObj($(elem).attr('style'));
				var b = CSSAnalyzer.textAttrToObj(arg);
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
		$('[style]:has-style("display:-ms-grid"), [style]:has-style("display:grid"), [data-ms-grid]').each(function () {
			var attr = CSSAnalyzer.textAttrToObj($(this).attr('style'));
			// For ie9
			if (!attr.display) {
				attr.display = '-ms-grid';
			}
			grids.push({
				selector: this,
				attributes: attr,
				tracks: extractTracks(this, attr)
			});
		});










		function findGrids(objCss) {
			var grids = [];
			$.each(objCss, function (i, block) {
				if (block.attributes) {
					if (block.attributes.display == '-ms-grid' ||
						block.attributes.display == 'grid') {
						grids.push({
							selector: block.selector,
							attributes: block.attributes,
							tracks: extractTracks(block.selector, block.attributes)
						});

						//grids.push(block);
					}
				}
			});
			return grids;
		}

		function extractTracks(selector, attrs) {
			var cols = attrs['-ms-grid-columns'] || 'auto';
			var rows = attrs['-ms-grid-rows'] || 'auto';
			cols = cols.toLowerCase().split(' ');
			rows = rows.toLowerCase().split(' ');

			
			// Find implicit columns and rows
			// http://www.w3.org/TR/2012/WD-css3-grid-layout-20120322/#implicit-columns-and-rows
			$(selector).children().each(function (i, e) {
				var gridItem = $(this);

				var attributes = getDefinedAttributesByElement(objCss, gridItem, CSSAnalyzer.textAttrToObj(gridItem.attr('style')));

				var row = attributes['-ms-grid-row'] || 1;
				var column = attributes['-ms-grid-column'] || 1;
				var columnSpan = attributes['-ms-grid-column-span'] || 1;
				var rowSpan = attributes['-ms-grid-row-span'] || 1;

				if (cols.length < column) {
					cols[column] = 'auto';
				}
				if (cols.length < (column - 1) + columnSpan) {
					cols[(column - 1) + columnSpan] = 'auto';
				}
				if (rows.length < row) {
					rows[row] = 'auto';
				}
				if (rows.length < (row - 1) + rowSpan) {
					rows[(row - 1) + rowSpan] = 'auto';
				}
			});

			var tracks = [];
			$.each(rows, function (x, rv) {
				tracks[x] = [];
				$.each(cols, function (y, cv) {
					tracks[x][y] = {
						x: (typeof cv !== "undefined" && validateValue(cv)) ? cv : 'auto',
						y: (typeof rv !== "undefined" && validateValue(rv)) ? rv : 'auto'
					};
				});
			});

			// Connect element to track
			$(selector).children().each(function (i, e) {
				var gridItem = $(this);

				var attributes = getDefinedAttributesByElement(objCss, gridItem, CSSAnalyzer.textAttrToObj(gridItem.attr('style')));

				var row = attributes['-ms-grid-row'] || 1;
				var column = attributes['-ms-grid-column'] || 1;
				if (tracks[row-1][column-1].item) {
					tracks[row-1][column-1].item = tracks[row-1][column-1].item.add(gridItem);
				} else {
					tracks[row-1][column-1].item = gridItem;
				}
			});
			return tracks;
		}

		function validateValue(value) {
			return /^(\d+(\.\d+)?(fr|px)|auto)$/.test(value);
		}

		function init(objCss, block) {
			"use strict";
			
			// Save old style
			$(block.selector).each(function() {
				if (!$(this).data('old-style')) {
					var gridItem = $(this);

					var attributes = getDefinedAttributesByElement(objCss, gridItem, CSSAnalyzer.textAttrToObj(gridItem.data('old-style')));

					var style = CSSAnalyzer.textAttrToObj($(this).attr('style'));

					if (attributes.width && !style.width) {
						style.width = attributes.width;
					}
					if (attributes.height && !style.height) {
						style.height = attributes.height;
					}

					$(this).data('old-style', CSSAnalyzer.objToTextAttr(style));
				}
			});

			// Save old style
			$(block.selector).children().each(function() {
				if (!$(this).data('old-style')) {
					$(this).data('old-style', $(this).attr('style'));
				}
			});
			
			block.hasInit = true;
		}

		var sortByGridDepth = function(a, b) {
			return $(a.selector).parents().length - $(b.selector).parents().length;
		};
		grids.sort(sortByGridDepth);

		// apply css
		$.each(grids, function (i, block) {
			
			init(objCss, block);

			gl_refresh($(block.selector), block);
			
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
				// TODO: should only be needed to clear cache when element or stylesheet have changed.
				//$.gridLayout('clearCache');

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
		
		/*
		 * Bug in Chrome. Need to trigger a repaint after setting width to auto
		 * http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
		 * 
		 * @param element DOM Element
		 */
		function triggerRepaint(element) {
			var oldDisplay = element.style.display;
			element.style.display = 'none';
			element.offsetWidth;
			element.style.display = oldDisplay;
		}

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
							
							// Bug in Chrome. Need to trigger a repaint after setting width to auto
							// http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
							triggerRepaint(tracks[r][c].item[0]);
							
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

			return (availableSpace < 0) ? width + Math.abs(availableSpace) : width;
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
							
							// Bug in Chrome. Need to trigger a repaint after setting width to auto
							// http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
							triggerRepaint(tracks[r][c].item[0]);
							
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

			return (availableSpace < 0) ? height + Math.abs(availableSpace) : height;
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
							
							// Bug in Chrome. Need to trigger a repaint after setting width to auto
							// http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
							triggerRepaint(tracks[r][c].item[0]);
							
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


		/*
		@param element jQuery object		
		*/
		function getDefinedAttributesByElement(objCss, element, extra) {
			extra = extra || {};
			var i;
			// Check if exists in cache
			if ((i = cacheGetDefinedAttributesByElementKey.indexOf(element.get(0))) !== -1) {
				// slice(0) is for "pass-by-value"
				return $.extend(true, {}, cacheGetDefinedAttributesByElement[i], extra);
			}
			var selectors = CSSAnalyzer.findDefinedSelectors(element.get(0));
			var attributes = getAttributesBySelector(objCss, selectors);

			// Save to cache
			cacheGetDefinedAttributesByElementKey.push(element.get(0));
			cacheGetDefinedAttributesByElement.push(attributes);

			return $.extend(true, {}, attributes, extra);
		}

		function getAttributesBySelector(objCss, selectors) {
			var found = {};
			$.each(selectors, function(i, selector) {
				$.each(objCss, function (i, block) {
					if (block.selector == selector.selector) {
						$.extend(true, found, block.attributes);
					}
				});
			});
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

	});
})(jQuery);