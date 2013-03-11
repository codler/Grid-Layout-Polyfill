/*! CSS3 Finalize - v1.1 - 2013-03-11 - Grid Layout Polyfill
* https://github.com/codler/Grid-Layout-Polyfill
* Copyright (c) 2013 Han Lin Yap http://yap.nu; http://creativecommons.org/licenses/by-sa/3.0/ */
function cssTextToObj(text) {
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


	console.clear();

	var objCss = cssTextToObj($('style').text());
	console.log(objCss);

	/* { selector, attributes, tracks : ([index-x/row][index-y/col] : { x, y }) } */
	var grids = findGrids(objCss);
	console.log(grids);

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
		$(block.selector).css({
			'position' : 'relative',
			'box-sizing': 'border-box',
			width: (block.attributes.display == '-ms-grid') ? '100%' : gridSize.x,
			height: gridSize.y
		});

		/*block.tracks = */normalizeFractionWidth($(block.selector).outerWidth(), block.tracks);
		normalizeFractionHeight($(block.selector).outerHeight(), block.tracks);

		console.log($(block.selector).outerWidth());
		console.log($(block.selector).outerHeight());
		console.log(block.tracks);

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
			selectors.sort(function(a, b) {
				a = getCSSRuleSpecificity(a)
				b = getCSSRuleSpecificity(b)
				if (a < b) {
					 return -1; 
				} else if(a > b) {
					 return 1;  
				} else {
					 return 0;   
				}
			});
			console.log(selectors);
			// TODO: merge all attr to find other same attributes

			var attributes = getAttributesBySelector(objCss, selectors.pop());
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

		for (var c = 0; c < tracks[0].length; c++) {
			var fractions = [];
			var totalHeightWithoutFractions = height;
			for (var r = 0; r < tracks.length; r++) {
				if (tracks[r][c].y.indexOf('fr') !== -1) {
					fractions.push(parseFloat(tracks[r][c].y));
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