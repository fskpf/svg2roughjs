import rough from 'roughjs/bin/rough';
import tinycolor from 'tinycolor2';
import { SVGPathData, SVGPathDataTransformer, encodeSVGPath } from 'svg-pathdata';

/**
 * A small helper class that represents a point.
 */
class Point {
    constructor(x, y) {
        this.$x = x || 0;
        this.$y = y || 0;
    }
    get x() {
        return this.$x;
    }
    get y() {
        return this.$y;
    }
    toString() {
        return `${this.x},${this.y}`;
    }
}

var RenderMode;
(function (RenderMode) {
    RenderMode[RenderMode["SVG"] = 0] = "SVG";
    RenderMode[RenderMode["CANVAS"] = 1] = "CANVAS";
})(RenderMode || (RenderMode = {}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const units = require('units-css');
/**
 * Regexp that detects curved commands in path data.
 */
const PATH_CURVES_REGEX = /[acsqt]/i;
/**
 * A simple regexp which is used to test whether a given string value
 * contains unit identifiers, e.g. "1px", "1em", "1%", ...
 */
const CONTAINS_UNIT_REGEXP = /[a-z%]/;
/**
 * Calculates the average color of the colors in the given array.
 * @returns The average color
 */
function averageColor(colorArray) {
    const count = colorArray.length;
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    colorArray.forEach(tinycolor => {
        const color = tinycolor.toRgb();
        r += color.r * color.r;
        g += color.g * color.g;
        b += color.b * color.b;
        a += color.a;
    });
    return tinycolor({
        r: Math.sqrt(r / count),
        g: Math.sqrt(g / count),
        b: Math.sqrt(b / count),
        a: a / count
    });
}
/**
 * Returns the Node's children, since Node.prototype.children is not available on all browsers.
 * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/children
 */
function getNodeChildren(element) {
    if (typeof element.children !== 'undefined') {
        return element.children;
    }
    let i = 0;
    let node;
    const nodes = element.childNodes;
    const children = [];
    while ((node = nodes[i++])) {
        if (node.nodeType === 1) {
            children.push(node);
        }
    }
    return children;
}
/**
 * @return length in pixels
 */
function getLengthInPx(svgLengthList) {
    if (svgLengthList && svgLengthList.baseVal.numberOfItems > 0) {
        return svgLengthList.baseVal.getItem(0).value;
    }
    return 0;
}
/**
 * Whether the given SVGTransform resembles an identity transform.
 * @returns Whether the transform is an identity transform.
 *  Returns true if transform is undefined.
 */
function isIdentityTransform(svgTransform) {
    if (!svgTransform) {
        return true;
    }
    const matrix = svgTransform.matrix;
    return (!matrix ||
        (matrix.a === 1 &&
            matrix.b === 0 &&
            matrix.c === 0 &&
            matrix.d === 1 &&
            matrix.e === 0 &&
            matrix.f === 0));
}
/**
 * Whether the given SVGTransform does not scale nor skew.
 * @returns Whether the given SVGTransform does not scale nor skew.
 *  Returns true if transform is undefined.
 */
function isTranslationTransform(svgTransform) {
    if (!svgTransform) {
        return true;
    }
    const matrix = svgTransform.matrix;
    return !matrix || (matrix.a === 1 && matrix.b === 0 && matrix.c === 0 && matrix.d === 1);
}
/**
 * Applies a given `SVGTransform` to the point.
 *
 * [a c e] [x] = (a*x + c*y + e)
 * [b d f] [y] = (b*x + d*y + f)
 * [0 0 1] [1] = (0 + 0 + 1)
 */
function applyMatrix(point, svgTransform) {
    if (!svgTransform) {
        return point;
    }
    const matrix = svgTransform.matrix;
    const x = matrix.a * point.x + matrix.c * point.y + matrix.e;
    const y = matrix.b * point.x + matrix.d * point.y + matrix.f;
    return new Point(x, y);
}
/**
 * Returns a random number in the given range.
 */
function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}
/**
 * Returns the `offset` of an `SVGStopElement`.
 * @return stop percentage
 */
function getStopOffset(stop) {
    const offset = stop.getAttribute('offset');
    if (!offset) {
        return 0;
    }
    if (offset.indexOf('%')) {
        return parseFloat(offset.substring(0, offset.length - 1));
    }
    else {
        return parseFloat(offset) * 100;
    }
}
/**
 * Returns the `stop-color` of an `SVGStopElement`.
 */
function getStopColor(stop) {
    var _a;
    let stopColorStr = stop.getAttribute('stop-color');
    if (!stopColorStr) {
        const style = (_a = stop.getAttribute('style')) !== null && _a !== void 0 ? _a : '';
        const match = /stop-color:\s?(.*);?/.exec(style);
        if (match && match.length > 1) {
            stopColorStr = match[1];
        }
    }
    return stopColorStr ? tinycolor(stopColorStr) : tinycolor('white');
}
/**
 * Converts an SVG gradient to a color by mixing all stop colors
 * with `tinycolor.mix`.
 */
function gradientToColor(gradient, opacity) {
    const stops = Array.prototype.slice.apply(gradient.querySelectorAll('stop'));
    if (stops.length === 0) {
        return 'transparent';
    }
    else if (stops.length === 1) {
        const color = getStopColor(stops[0]);
        color.setAlpha(opacity);
        return color.toString();
    }
    else {
        // Because roughjs can only deal with solid colors, we try to calculate
        // the average color of the gradient here.
        // The idea is to create an array of discrete (average) colors that represents the
        // gradient under consideration of the stop's offset. Thus, larger offsets
        // result in more entries of the same mixed color (of the two adjacent color stops).
        // At the end, this array is averaged again, to create a single solid color.
        const resolution = 10;
        const discreteColors = [];
        let lastColor = null;
        for (let i = 0; i < stops.length; i++) {
            const currentColor = getStopColor(stops[i]);
            const currentOffset = getStopOffset(stops[i]);
            // combine the adjacent colors
            const combinedColor = lastColor ? averageColor([lastColor, currentColor]) : currentColor;
            // fill the discrete color array depending on the offset size
            let entries = Math.max(1, (currentOffset / resolution) | 0);
            while (entries > 0) {
                discreteColors.push(combinedColor);
                entries--;
            }
            lastColor = currentColor;
        }
        // average the discrete colors again for the final result
        const mixedColor = averageColor(discreteColors);
        mixedColor.setAlpha(opacity);
        return mixedColor.toString();
    }
}
/**
 * Returns the id from the url string
 */
function getIdFromUrl(url) {
    if (url === null) {
        return null;
    }
    const result = /url\('#?(.*?)'\)/.exec(url) || /url\("#?(.*?)"\)/.exec(url) || /url\(#?(.*?)\)/.exec(url);
    if (result && result.length > 1) {
        return result[1];
    }
    return null;
}
/**
 * Converts SVG opacity attributes to a [0, 1] range.
 */
function getOpacity(element, attribute) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attr = getComputedStyle(element)[attribute] || element.getAttribute(attribute);
    if (attr) {
        if (attr.indexOf('%') !== -1) {
            return Math.min(1, Math.max(0, parseFloat(attr.substring(0, attr.length - 1)) / 100));
        }
        return Math.min(1, Math.max(0, parseFloat(attr)));
    }
    return 1;
}
/**
 * Returns the consolidated transform of the given element.
 */
function getSvgTransform(element) {
    if (element.transform && element.transform.baseVal.numberOfItems > 0) {
        return element.transform.baseVal.consolidate();
    }
    return null;
}
function getDefsElement(svgElement) {
    let outputDefs = svgElement.querySelector('defs');
    if (!outputDefs) {
        outputDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        if (svgElement.childElementCount > 0) {
            svgElement.insertBefore(outputDefs, svgElement.firstElementChild);
        }
        else {
            svgElement.appendChild(outputDefs);
        }
    }
    return outputDefs;
}
function isHidden(element) {
    const style = element.style;
    if (!style) {
        return false;
    }
    return style.display === 'none' || style.visibility === 'hidden';
}
/**
 * The angle in degree of the line defined by the given points.
 */
function getAngle(p0, p1) {
    return Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);
}
function getPointsArray(element) {
    const pointsAttr = element.getAttribute('points');
    if (!pointsAttr) {
        return [];
    }
    let coordinateRegexp;
    if (pointsAttr.indexOf(' ') > 0) {
        // just assume that the coordinates (or pairs) are separated with space
        coordinateRegexp = /\s+/g;
    }
    else {
        // there are no spaces, so assume comma separators
        coordinateRegexp = /,/g;
    }
    const pointList = pointsAttr.split(coordinateRegexp);
    const points = [];
    for (let i = 0; i < pointList.length; i++) {
        const currentEntry = pointList[i];
        const coordinates = currentEntry.split(',');
        if (coordinates.length === 2) {
            points.push(new Point(parseFloat(coordinates[0]), parseFloat(coordinates[1])));
        }
        else {
            // space as separators, take next entry as y coordinate
            const next = i + 1;
            if (next < pointList.length) {
                points.push(new Point(parseFloat(currentEntry), parseFloat(pointList[next])));
                // skip the next entry
                i = next;
            }
        }
    }
    return points;
}
/**
 * Traverses the given elements hierarchy bottom-up to determine its effective
 * opacity attribute.
 * @param currentUseCtx Consider different DOM hierarchy for use elements
 */
function getEffectiveElementOpacity(context, element, currentOpacity, currentUseCtx) {
    let attr;
    if (!currentUseCtx) {
        attr = getComputedStyle(element)['opacity'] || element.getAttribute('opacity');
    }
    else {
        // use elements traverse a different parent-hierarchy, thus we cannot use getComputedStyle here
        attr = element.getAttribute('opacity');
    }
    if (attr) {
        let elementOpacity = 1;
        if (attr.indexOf('%') !== -1) {
            elementOpacity = Math.min(1, Math.max(0, parseFloat(attr.substring(0, attr.length - 1)) / 100));
        }
        else {
            elementOpacity = Math.min(1, Math.max(0, parseFloat(attr)));
        }
        // combine opacities
        currentOpacity *= elementOpacity;
    }
    // traverse upwards to combine parent opacities as well
    let parent = element.parentElement;
    const useCtx = currentUseCtx;
    let nextUseCtx = useCtx;
    if (useCtx && useCtx.referenced === element) {
        // switch context and traverse the use-element parent now
        parent = useCtx.root;
        nextUseCtx = useCtx.parentContext;
    }
    if (!parent || parent === context.sourceSvg) {
        return currentOpacity;
    }
    return getEffectiveElementOpacity(context, parent, currentOpacity, nextUseCtx);
}
/**
 * Returns the attribute value of an element under consideration
 * of inherited attributes from the `parentElement`.
 * @param attributeName Name of the attribute to look up
 * @param currentUseCtx Consider different DOM hierarchy for use elements
 * @return attribute value if it exists
 */
function getEffectiveAttribute(context, element, attributeName, currentUseCtx) {
    // getComputedStyle doesn't work for, e.g. <svg fill='rgba(...)'>
    let attr;
    if (!currentUseCtx) {
        attr =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            getComputedStyle(element)[attributeName] || element.getAttribute(attributeName);
    }
    else {
        // use elements traverse a different parent-hierarchy, thus we cannot use getComputedStyle here
        attr = element.getAttribute(attributeName);
    }
    if (!attr) {
        let parent = element.parentElement;
        const useCtx = currentUseCtx;
        let nextCtx = useCtx;
        if (useCtx && useCtx.referenced === element) {
            // switch context and traverse the use-element parent now
            parent = useCtx.root;
            nextCtx = useCtx.parentContext;
        }
        if (!parent || parent === context.sourceSvg) {
            return null;
        }
        return getEffectiveAttribute(context, parent, attributeName, nextCtx);
    }
    return attr;
}
/**
 * Parses a `fill` url by looking in the SVG `defs` element.
 * When a gradient is found, it is converted to a color and stored
 * in the internal defs store for this url.
 * @returns The parsed color
 */
function parseFillUrl(context, url, opacity) {
    const id = getIdFromUrl(url);
    if (!id) {
        return 'transparent';
    }
    const fill = context.idElements[id];
    if (fill) {
        if (typeof fill === 'string') {
            // maybe it was already parsed and replaced with a color
            return fill;
        }
        else {
            if (fill instanceof SVGLinearGradientElement || fill instanceof SVGRadialGradientElement) {
                const color = gradientToColor(fill, opacity);
                context.idElements[id] = color;
                return color;
            }
        }
    }
}
/**
 * Converts the given string to px unit. May be either a <length>
 * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Length)
 * or a <percentage>
 * (https://developer.mozilla.org/de/docs/Web/SVG/Content_type#Percentage).
 * @returns The value in px unit
 */
function convertToPixelUnit(context, value) {
    // css-units fails for converting from unit-less to 'px' in IE11,
    // thus we only apply it to non-px values
    if (value.match(CONTAINS_UNIT_REGEXP) !== null) {
        return units.convert('px', value, context.sourceSvg);
    }
    return parseFloat(value);
}
/**
 * Converts the effective style attributes of the given `SVGElement`
 * to a Rough.js config object that is used to draw the element with
 * Rough.js.
 * @return config for Rough.js drawing
 */
function parseStyleConfig(context, element, svgTransform) {
    const config = Object.assign({}, context.roughConfig);
    // Scalefactor for certain style attributes. For lack of a better option here, use the determinant
    let scaleFactor = 1;
    if (!isIdentityTransform(svgTransform)) {
        const m = svgTransform.matrix;
        const det = m.a * m.d - m.c * m.b;
        scaleFactor = Math.sqrt(det);
    }
    // incorporate the elements base opacity
    const elementOpacity = getEffectiveElementOpacity(context, element, 1, context.useElementContext);
    const fill = getEffectiveAttribute(context, element, 'fill', context.useElementContext) || 'black';
    const fillOpacity = elementOpacity * getOpacity(element, 'fill-opacity');
    if (fill) {
        if (fill.indexOf('url') !== -1) {
            config.fill = parseFillUrl(context, fill, fillOpacity);
        }
        else if (fill === 'none') {
            delete config.fill;
        }
        else {
            const color = tinycolor(fill);
            color.setAlpha(fillOpacity);
            config.fill = color.toString();
        }
    }
    const stroke = getEffectiveAttribute(context, element, 'stroke', context.useElementContext);
    const strokeOpacity = elementOpacity * getOpacity(element, 'stroke-opacity');
    if (stroke) {
        if (stroke.indexOf('url') !== -1) {
            config.stroke = parseFillUrl(context, fill, strokeOpacity);
        }
        else if (stroke === 'none') {
            config.stroke = 'none';
        }
        else {
            const color = tinycolor(stroke);
            color.setAlpha(strokeOpacity);
            config.stroke = color.toString();
        }
    }
    else {
        config.stroke = 'none';
    }
    const strokeWidth = getEffectiveAttribute(context, element, 'stroke-width', context.useElementContext);
    if (strokeWidth) {
        // Convert to user space units (px)
        config.strokeWidth = convertToPixelUnit(context, strokeWidth) * scaleFactor;
    }
    else {
        config.strokeWidth = 0;
    }
    const strokeDashArray = getEffectiveAttribute(context, element, 'stroke-dasharray', context.useElementContext);
    if (strokeDashArray && strokeDashArray !== 'none') {
        config.strokeLineDash = strokeDashArray
            .split(/[\s,]+/)
            .filter(entry => entry.length > 0)
            // make sure that dashes/dots are at least somewhat visible
            .map(dash => Math.max(0.5, convertToPixelUnit(context, dash) * scaleFactor));
    }
    const strokeDashOffset = getEffectiveAttribute(context, element, 'stroke-dashoffset', context.useElementContext);
    if (strokeDashOffset) {
        config.strokeLineDashOffset = convertToPixelUnit(context, strokeDashOffset) * scaleFactor;
    }
    // unstroked but filled shapes look weird, so always apply a stroke if we fill something
    if (config.fill && config.stroke === 'none') {
        config.stroke = config.fill;
        config.strokeWidth = 1;
    }
    // nested paths should be filled twice, see
    // https://github.com/rough-stuff/rough/issues/158
    // however, fill-rule is still problematic, see
    // https://github.com/rough-stuff/rough/issues/131
    if (typeof config.combineNestedSvgPaths === 'undefined') {
        config.combineNestedSvgPaths = true;
    }
    if (context.randomize) {
        // Rough.js default is 0.5 * strokeWidth
        config.fillWeight = getRandomNumber(0.5, 3);
        // Rough.js default is -41deg
        config.hachureAngle = getRandomNumber(-30, -50);
        // Rough.js default is 4 * strokeWidth
        config.hachureGap = getRandomNumber(3, 5);
        // randomize double stroke effect if not explicitly set through user config
        if (typeof config.disableMultiStroke === 'undefined') {
            config.disableMultiStroke = Math.random() > 0.3;
        }
    }
    return config;
}
/**
 * Helper method to append the returned `SVGGElement` from
 * Rough.js when drawing in SVG mode.
 */
function postProcessElement(context, element, sketchElement) {
    if (context.renderMode === RenderMode.SVG && context.targetSvg && sketchElement) {
        sketchElement = sketchElement;
        // wrap it in another container to safely apply post-processing attributes
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.appendChild(sketchElement);
        // maybe apply a clip-path
        const sketchClipPathId = element.getAttribute('data-sketchy-clip-path');
        if (sketchClipPathId) {
            g.setAttribute('clip-path', `url(#${sketchClipPathId})`);
        }
        if (context.pencilFilter && element.tagName !== 'text') {
            g.setAttribute('filter', 'url(#pencilTextureFilter)');
        }
        context.targetSvg.appendChild(g);
    }
}
/**
 * Helper method to sketch a path.
 * Paths with curves should utilize the preserverVertices option to avoid line disjoints.
 * For non-curved paths it looks nicer to actually allow these diskoints.
 * @returns Returns the SVGElement for the SVG render mode, or undefined otherwise
 */
function sketchPath(context, path, options) {
    if (PATH_CURVES_REGEX.test(path)) {
        options = options ? Object.assign(Object.assign({}, options), { preserveVertices: true }) : { preserveVertices: true };
    }
    return context.rc.path(path, options);
}
/**
 * Combines the given transform with the element's transform.
 * If no transform is given, it returns the SVGTransform of the element.
 */
function getCombinedTransform(context, element, transform) {
    if (!transform) {
        return getSvgTransform(element);
    }
    const elementTransform = getSvgTransform(element);
    if (elementTransform) {
        const elementTransformMatrix = elementTransform.matrix;
        const combinedMatrix = transform.matrix.multiply(elementTransformMatrix);
        return context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix);
    }
    return transform;
}
/**
 * Applies the given svgTransform to the canvas context or the given element when in SVG mode.
 * @param element The element to which the transform should be applied
 * when in SVG mode.
 */
function applyGlobalTransform(context, svgTransform, element) {
    if (svgTransform && svgTransform.matrix) {
        const matrix = svgTransform.matrix;
        if (context.renderMode === RenderMode.CANVAS && context.targetCanvasContext) {
            // IE11 doesn't support SVGMatrix as parameter for setTransform
            context.targetCanvasContext.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
        }
        else if (context.renderMode === RenderMode.SVG && element) {
            if (element.transform.baseVal.numberOfItems > 0) {
                element.transform.baseVal.getItem(0).setMatrix(matrix);
            }
            else {
                element.transform.baseVal.appendItem(svgTransform);
            }
        }
    }
}

function drawCircle(context, circle, svgTransform) {
    const cx = circle.cx.baseVal.value;
    const cy = circle.cy.baseVal.value;
    const r = circle.r.baseVal.value;
    if (r === 0) {
        // zero-radius circle is not rendered
        return;
    }
    const center = applyMatrix(new Point(cx, cy), svgTransform);
    let result;
    if (isIdentityTransform(svgTransform) || isTranslationTransform(svgTransform)) {
        // transform a point on the ellipse to get the transformed radius
        const radiusPoint = applyMatrix(new Point(cx + r, cy + r), svgTransform);
        const transformedWidth = 2 * (radiusPoint.x - center.x);
        result = context.rc.circle(center.x, center.y, transformedWidth, Object.assign(Object.assign({}, parseStyleConfig(context, circle, svgTransform)), { preserveVertices: true }));
    }
    else {
        // in other cases we need to construct the path manually.
        const factor = (4 / 3) * (Math.sqrt(2) - 1);
        const p1 = applyMatrix(new Point(cx + r, cy), svgTransform);
        const p2 = applyMatrix(new Point(cx, cy + r), svgTransform);
        const p3 = applyMatrix(new Point(cx - r, cy), svgTransform);
        const p4 = applyMatrix(new Point(cx, cy - r), svgTransform);
        const c1 = applyMatrix(new Point(cx + r, cy + factor * r), svgTransform);
        const c2 = applyMatrix(new Point(cx + factor * r, cy + r), svgTransform);
        const c4 = applyMatrix(new Point(cx - r, cy + factor * r), svgTransform);
        const c6 = applyMatrix(new Point(cx - factor * r, cy - r), svgTransform);
        const c8 = applyMatrix(new Point(cx + r, cy - factor * r), svgTransform);
        const path = `M ${p1} C ${c1} ${c2} ${p2} S ${c4} ${p3} S ${c6} ${p4} S ${c8} ${p1}z`;
        result = sketchPath(context, path, parseStyleConfig(context, circle, svgTransform));
    }
    postProcessElement(context, circle, result);
}
function applyCircleClip(context, circle, container, svgTransform) {
    const cx = circle.cx.baseVal.value;
    const cy = circle.cy.baseVal.value;
    const r = circle.r.baseVal.value;
    if (r === 0) {
        // zero-radius circle is not rendered
        return;
    }
    const targetCtx = context.targetCanvasContext;
    if (context.renderMode === RenderMode.CANVAS && targetCtx) {
        // in the clip case, we can actually transform the entire
        // canvas without distorting the hand-drawn style
        targetCtx.save();
        applyGlobalTransform(context, svgTransform);
        targetCtx.ellipse(cx, cy, r, r, 0, 0, 2 * Math.PI);
        targetCtx.restore();
    }
    else {
        const clip = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        clip.cx.baseVal.value = cx;
        clip.cy.baseVal.value = cy;
        clip.r.baseVal.value = r;
        applyGlobalTransform(context, svgTransform, clip);
        container.appendChild(clip);
    }
}

function drawEllipse(context, ellipse, svgTransform) {
    const cx = ellipse.cx.baseVal.value;
    const cy = ellipse.cy.baseVal.value;
    const rx = ellipse.rx.baseVal.value;
    const ry = ellipse.ry.baseVal.value;
    if (rx === 0 || ry === 0) {
        // zero-radius ellipse is not rendered
        return;
    }
    let result;
    if (isIdentityTransform(svgTransform) || isTranslationTransform(svgTransform)) {
        // Simple case, there's no transform and we can use the ellipse command
        const center = applyMatrix(new Point(cx, cy), svgTransform);
        // transform a point on the ellipse to get the transformed radius
        const radiusPoint = applyMatrix(new Point(cx + rx, cy + ry), svgTransform);
        const transformedWidth = 2 * (radiusPoint.x - center.x);
        const transformedHeight = 2 * (radiusPoint.y - center.y);
        result = context.rc.ellipse(center.x, center.y, transformedWidth, transformedHeight, Object.assign(Object.assign({}, parseStyleConfig(context, ellipse, svgTransform)), { preserveVertices: true }));
    }
    else {
        // in other cases we need to construct the path manually.
        const factor = (4 / 3) * (Math.sqrt(2) - 1);
        const p1 = applyMatrix(new Point(cx + rx, cy), svgTransform);
        const p2 = applyMatrix(new Point(cx, cy + ry), svgTransform);
        const p3 = applyMatrix(new Point(cx - rx, cy), svgTransform);
        const p4 = applyMatrix(new Point(cx, cy - ry), svgTransform);
        const c1 = applyMatrix(new Point(cx + rx, cy + factor * ry), svgTransform);
        const c2 = applyMatrix(new Point(cx + factor * rx, cy + ry), svgTransform);
        const c4 = applyMatrix(new Point(cx - rx, cy + factor * ry), svgTransform);
        const c6 = applyMatrix(new Point(cx - factor * rx, cy - ry), svgTransform);
        const c8 = applyMatrix(new Point(cx + rx, cy - factor * ry), svgTransform);
        const path = `M ${p1} C ${c1} ${c2} ${p2} S ${c4} ${p3} S ${c6} ${p4} S ${c8} ${p1}z`;
        result = sketchPath(context, path, parseStyleConfig(context, ellipse, svgTransform));
    }
    postProcessElement(context, ellipse, result);
}
function applyEllipseClip(context, ellipse, container, svgTransform) {
    const cx = ellipse.cx.baseVal.value;
    const cy = ellipse.cy.baseVal.value;
    const rx = ellipse.rx.baseVal.value;
    const ry = ellipse.ry.baseVal.value;
    if (rx === 0 || ry === 0) {
        // zero-radius ellipse is not rendered
        return;
    }
    const targetCtx = context.targetCanvasContext;
    if (context.renderMode === RenderMode.CANVAS && targetCtx) {
        // in the clip case, we can actually transform the entire
        // canvas without distorting the hand-drawn style
        targetCtx.save();
        applyGlobalTransform(context, svgTransform);
        targetCtx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        targetCtx.restore();
    }
    else {
        const clip = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        clip.cx.baseVal.value = cx;
        clip.cy.baseVal.value = cy;
        clip.rx.baseVal.value = rx;
        clip.ry.baseVal.value = ry;
        applyGlobalTransform(context, svgTransform, clip);
        container.appendChild(clip);
    }
}

function drawMarkers(context, element, points, svgTransform) {
    if (points.length === 0) {
        return;
    }
    // consider scaled coordinate system for markerWidth/markerHeight
    const markerUnits = element.getAttribute('markerUnits');
    let scaleFactor = 1;
    if (!markerUnits || markerUnits === 'strokeWidth') {
        const strokeWidth = getEffectiveAttribute(context, element, 'stroke-width');
        if (strokeWidth) {
            scaleFactor = convertToPixelUnit(context, strokeWidth);
        }
    }
    // start marker
    const markerStartId = getIdFromUrl(element.getAttribute('marker-start'));
    const markerStartElement = markerStartId
        ? context.idElements[markerStartId]
        : null;
    if (markerStartElement) {
        let angle = markerStartElement.orientAngle.baseVal.value;
        if (points.length > 1) {
            const orientAttr = markerStartElement.getAttribute('orient');
            if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
                const autoAngle = getAngle(points[0], points[1]);
                angle = orientAttr === 'auto' ? autoAngle : autoAngle + 180;
            }
        }
        const location = points[0];
        const matrix = context.sourceSvg
            .createSVGMatrix()
            .translate(location.x, location.y)
            .rotate(angle)
            .scale(scaleFactor);
        const combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
        const markerTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix);
        processRoot(context, markerStartElement, markerTransform);
    }
    // end marker
    const markerEndId = getIdFromUrl(element.getAttribute('marker-end'));
    const markerEndElement = markerEndId
        ? context.idElements[markerEndId]
        : null;
    if (markerEndElement) {
        let angle = markerEndElement.orientAngle.baseVal.value;
        if (points.length > 1) {
            const orientAttr = markerEndElement.getAttribute('orient');
            if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
                angle = getAngle(points[points.length - 2], points[points.length - 1]);
            }
        }
        const location = points[points.length - 1];
        const matrix = context.sourceSvg
            .createSVGMatrix()
            .translate(location.x, location.y)
            .rotate(angle)
            .scale(scaleFactor);
        const combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
        const markerTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix);
        processRoot(context, markerEndElement, markerTransform);
    }
    // mid marker(s)
    const markerMidId = getIdFromUrl(element.getAttribute('marker-mid'));
    const markerMidElement = markerMidId
        ? context.idElements[markerMidId]
        : null;
    if (markerMidElement && points.length > 2) {
        for (let i = 0; i < points.length; i++) {
            const loc = points[i];
            if (i === 0 || i === points.length - 1) {
                // mid markers are not drawn on first or last point
                continue;
            }
            let angle = markerMidElement.orientAngle.baseVal.value;
            const orientAttr = markerMidElement.getAttribute('orient');
            if (orientAttr === 'auto' || orientAttr === 'auto-start-reverse') {
                const prevPt = points[i - 1];
                const nextPt = points[i + 1];
                // https://www.w3.org/TR/SVG11/painting.html#OrientAttribute
                // use angle bisector of incoming and outgoing angle
                const inAngle = getAngle(prevPt, loc);
                const outAngle = getAngle(loc, nextPt);
                const reverse = nextPt.x < loc.x ? 180 : 0;
                angle = (inAngle + outAngle) / 2 + reverse;
            }
            const matrix = context.sourceSvg
                .createSVGMatrix()
                .translate(loc.x, loc.y)
                .rotate(angle)
                .scale(scaleFactor);
            const combinedMatrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
            const markerTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix);
            processRoot(context, markerMidElement, markerTransform);
        }
    }
}

function drawPolygon(context, polygon, svgTransform) {
    const points = getPointsArray(polygon);
    const transformed = points.map(p => {
        const pt = applyMatrix(p, svgTransform);
        return [pt.x, pt.y];
    });
    const polygonSketch = context.rc.polygon(transformed, parseStyleConfig(context, polygon, svgTransform));
    postProcessElement(context, polygon, polygonSketch);
    // https://www.w3.org/TR/SVG11/painting.html#MarkerProperties
    // Note that for a ‘path’ element which ends with a closed sub-path,
    // the last vertex is the same as the initial vertex on the given
    // sub-path (same applies to polygon).
    if (points.length > 0) {
        points.push(points[0]);
        drawMarkers(context, polygon, points, svgTransform);
    }
}
function applyPolygonClip(context, polygon, container, svgTransform) {
    const targetCtx = context.targetCanvasContext;
    if (context.renderMode === RenderMode.CANVAS && targetCtx) {
        const points = getPointsArray(polygon);
        // in the clip case, we can actually transform the entire
        // canvas without distorting the hand-drawn style
        if (points.length > 0) {
            targetCtx.save();
            applyGlobalTransform(context, svgTransform);
            const startPt = points[0];
            targetCtx.moveTo(startPt.x, startPt.y);
            for (let i = 1; i < points.length; i++) {
                const pt = points[i];
                targetCtx.lineTo(pt.x, pt.y);
            }
            targetCtx.closePath();
            targetCtx.restore();
        }
    }
    else {
        const clip = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        clip.setAttribute('points', polygon.getAttribute('points'));
        applyGlobalTransform(context, svgTransform, clip);
        container.appendChild(clip);
    }
}

function drawRect(context, rect, svgTransform) {
    const x = rect.x.baseVal.value;
    const y = rect.y.baseVal.value;
    const width = rect.width.baseVal.value;
    const height = rect.height.baseVal.value;
    if (width === 0 || height === 0) {
        // zero-width or zero-height rect will not be rendered
        return;
    }
    // Negative values are an error and result in the default value, and clamp both values to half their sides' lengths
    let rx = rect.hasAttribute('rx') ? Math.min(Math.max(0, rect.rx.baseVal.value), width / 2) : null;
    let ry = rect.hasAttribute('ry') ? Math.min(Math.max(0, rect.ry.baseVal.value), height / 2) : null;
    if (rx !== null || ry !== null) {
        // If only one of the two values is specified, the other has the same value
        rx = rx === null ? ry : rx;
        ry = ry === null ? rx : ry;
    }
    if ((isIdentityTransform(svgTransform) || isTranslationTransform(svgTransform)) && !rx && !ry) {
        // Simple case; just a rectangle
        const p1 = applyMatrix(new Point(x, y), svgTransform);
        const p2 = applyMatrix(new Point(x + width, y + height), svgTransform);
        const transformedWidth = p2.x - p1.x;
        const transformedHeight = p2.y - p1.y;
        const sketchRect = context.rc.rectangle(p1.x, p1.y, transformedWidth, transformedHeight, parseStyleConfig(context, rect, svgTransform));
        postProcessElement(context, rect, sketchRect);
    }
    else {
        let path = '';
        if (rx !== null && ry !== null) {
            const factor = (4 / 3) * (Math.sqrt(2) - 1);
            // Construct path for the rounded rectangle
            // perform an absolute moveto operation to location (x+rx,y), where x is the value of the ‘rect’ element's ‘x’ attribute converted to user space, rx is the effective value of the ‘rx’ attribute converted to user space and y is the value of the ‘y’ attribute converted to user space
            const p1 = applyMatrix(new Point(x + rx, y), svgTransform);
            path += `M ${p1}`;
            // perform an absolute horizontal lineto operation to location (x+width-rx,y), where width is the ‘rect’ element's ‘width’ attribute converted to user space
            const p2 = applyMatrix(new Point(x + width - rx, y), svgTransform);
            path += `L ${p2}`;
            // perform an absolute elliptical arc operation to coordinate (x+width,y+ry), where the effective values for the ‘rx’ and ‘ry’ attributes on the ‘rect’ element converted to user space are used as the rx and ry attributes on the elliptical arc command, respectively, the x-axis-rotation is set to zero, the large-arc-flag is set to zero, and the sweep-flag is set to one
            const p3c1 = applyMatrix(new Point(x + width - rx + factor * rx, y), svgTransform);
            const p3c2 = applyMatrix(new Point(x + width, y + factor * ry), svgTransform);
            const p3 = applyMatrix(new Point(x + width, y + ry), svgTransform);
            path += `C ${p3c1} ${p3c2} ${p3}`; // We cannot use the arc command, since we no longer draw in the expected coordinates. So approximate everything with lines and béziers
            // perform a absolute vertical lineto to location (x+width,y+height-ry), where height is the ‘rect’ element's ‘height’ attribute converted to user space
            const p4 = applyMatrix(new Point(x + width, y + height - ry), svgTransform);
            path += `L ${p4}`;
            // perform an absolute elliptical arc operation to coordinate (x+width-rx,y+height)
            const p5c1 = applyMatrix(new Point(x + width, y + height - ry + factor * ry), svgTransform);
            const p5c2 = applyMatrix(new Point(x + width - factor * rx, y + height), svgTransform);
            const p5 = applyMatrix(new Point(x + width - rx, y + height), svgTransform);
            path += `C ${p5c1} ${p5c2} ${p5}`;
            // perform an absolute horizontal lineto to location (x+rx,y+height)
            const p6 = applyMatrix(new Point(x + rx, y + height), svgTransform);
            path += `L ${p6}`;
            // perform an absolute elliptical arc operation to coordinate (x,y+height-ry)
            const p7c1 = applyMatrix(new Point(x + rx - factor * rx, y + height), svgTransform);
            const p7c2 = applyMatrix(new Point(x, y + height - factor * ry), svgTransform);
            const p7 = applyMatrix(new Point(x, y + height - ry), svgTransform);
            path += `C ${p7c1} ${p7c2} ${p7}`;
            // perform an absolute absolute vertical lineto to location (x,y+ry)
            const p8 = applyMatrix(new Point(x, y + ry), svgTransform);
            path += `L ${p8}`;
            // perform an absolute elliptical arc operation to coordinate (x+rx,y)
            const p9c1 = applyMatrix(new Point(x, y + factor * ry), svgTransform);
            const p9c2 = applyMatrix(new Point(x + factor * rx, y), svgTransform);
            path += `C ${p9c1} ${p9c2} ${p1}`;
            path += 'z';
        }
        else {
            // No rounding, so just construct the respective path as a simple polygon
            const p1 = applyMatrix(new Point(x, y), svgTransform);
            const p2 = applyMatrix(new Point(x + width, y), svgTransform);
            const p3 = applyMatrix(new Point(x + width, y + height), svgTransform);
            const p4 = applyMatrix(new Point(x, y + height), svgTransform);
            path += `M ${p1}`;
            path += `L ${p2}`;
            path += `L ${p3}`;
            path += `L ${p4}`;
            path += `z`;
        }
        const canvasCtx = context.targetCanvasContext;
        // must use square line cap here so it looks like a rectangle. Default seems to be butt.
        if (context.renderMode === RenderMode.CANVAS && canvasCtx) {
            canvasCtx.save();
            canvasCtx.lineCap = 'square';
        }
        const result = sketchPath(context, path, parseStyleConfig(context, rect, svgTransform));
        if (context.renderMode === RenderMode.SVG && result) {
            result.setAttribute('stroke-linecap', 'square');
        }
        postProcessElement(context, rect, result);
        if (context.renderMode === RenderMode.CANVAS && canvasCtx) {
            canvasCtx.restore();
        }
    }
}
function applyRectClip(context, rect, container, svgTransform) {
    const x = rect.x.baseVal.value;
    const y = rect.y.baseVal.value;
    const width = rect.width.baseVal.value;
    const height = rect.height.baseVal.value;
    if (width === 0 || height === 0) {
        // zero-width or zero-height rect will not be rendered
        return;
    }
    const rx = rect.hasAttribute('rx') ? rect.rx.baseVal.value : null;
    const ry = rect.hasAttribute('ry') ? rect.ry.baseVal.value : null;
    // in the clip case, we can actually transform the entire
    // canvas without distorting the hand-drawn style
    const targetCtx = context.targetCanvasContext;
    if (context.renderMode === RenderMode.CANVAS && targetCtx) {
        targetCtx.save();
        applyGlobalTransform(context, svgTransform);
        if (rx !== null && ry !== null) {
            // Construct path for the rounded rectangle
            const factor = (4 / 3) * (Math.sqrt(2) - 1);
            targetCtx.moveTo(x + rx, y);
            targetCtx.lineTo(x + width - rx, y);
            targetCtx.bezierCurveTo(x + width - rx + factor * rx, y, x + width, y + factor * ry, x + width, y + ry);
            targetCtx.lineTo(x + width, y + height - ry);
            targetCtx.bezierCurveTo(x + width, y + height - ry + factor * ry, x + width - factor * rx, y + height, x + width - rx, y + height);
            targetCtx.lineTo(x + rx, y + height);
            targetCtx.bezierCurveTo(x + rx - factor * rx, y + height, x, y + height - factor * ry, x, y + height - ry);
            targetCtx.lineTo(x, y + ry);
            targetCtx.bezierCurveTo(x, y + factor * ry, x + factor * rx, y, x + rx, y);
            targetCtx.closePath();
        }
        else {
            targetCtx.rect(x, y, width, height);
        }
        targetCtx.restore();
    }
    else {
        const clip = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        clip.x.baseVal.value = x;
        clip.y.baseVal.value = y;
        clip.width.baseVal.value = width;
        clip.height.baseVal.value = height;
        if (rx) {
            clip.rx.baseVal.value = rx;
        }
        if (ry) {
            clip.ry.baseVal.value = ry;
        }
        applyGlobalTransform(context, svgTransform, clip);
        container.appendChild(clip);
    }
}

/**
 * Applies the clip-path to the CanvasContext.
 */
function applyClipPath(context, owner, clipPathAttr, svgTransform) {
    const id = getIdFromUrl(clipPathAttr);
    if (!id) {
        return;
    }
    const clipPath = context.idElements[id];
    if (!clipPath) {
        return;
    }
    // TODO clipPath: consider clipPathUnits
    let clipContainer = null;
    const targetCtx = context.targetCanvasContext;
    if (context.renderMode === RenderMode.CANVAS && targetCtx) {
        // for a canvas, we just apply a 'ctx.clip()' path
        targetCtx.beginPath();
    }
    else if (context.targetSvg) {
        // for SVG output we create clipPath defs
        const targetDefs = getDefsElement(context.targetSvg);
        // unfortunately, we cannot reuse clip-paths due to the 'global transform' approach
        const sketchClipPathId = `${id}_${targetDefs.childElementCount}`;
        clipContainer = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipContainer.id = sketchClipPathId;
        // remember the new id by storing it on the owner element
        owner.setAttribute('data-sketchy-clip-path', sketchClipPathId);
        targetDefs.appendChild(clipContainer);
    }
    // traverse clip-path elements in DFS
    const stack = [];
    const children = getNodeChildren(clipPath);
    for (let i = children.length - 1; i >= 0; i--) {
        const childElement = children[i];
        const childTransform = getCombinedTransform(context, childElement, svgTransform);
        stack.push({ element: childElement, transform: childTransform });
    }
    while (stack.length > 0) {
        const { element, transform } = stack.pop();
        applyElementClip(context, element, clipContainer, transform);
        if (element.tagName === 'defs' ||
            element.tagName === 'svg' ||
            element.tagName === 'clipPath' ||
            element.tagName === 'text') {
            // some elements are ignored on clippaths
            continue;
        }
        // process children
        const children = getNodeChildren(element);
        for (let i = children.length - 1; i >= 0; i--) {
            const childElement = children[i];
            const childTransform = getCombinedTransform(context, childElement, transform);
            stack.push({ element: childElement, transform: childTransform });
        }
    }
    if (context.renderMode === RenderMode.CANVAS && targetCtx) {
        targetCtx.clip();
    }
}
/**
 * Applies the element as clip to the CanvasContext.
 */
function applyElementClip(context, element, container, svgTransform) {
    switch (element.tagName) {
        case 'rect':
            applyRectClip(context, element, container, svgTransform);
            break;
        case 'circle':
            applyCircleClip(context, element, container, svgTransform);
            break;
        case 'ellipse':
            applyEllipseClip(context, element, container, svgTransform);
            break;
        case 'polygon':
            applyPolygonClip(context, element, container, svgTransform);
            break;
        // TODO clipPath: more elements
    }
}

function drawImage(context, svgImage, svgTransform) {
    const href = svgImage.href.baseVal;
    const x = svgImage.x.baseVal.value;
    const y = svgImage.y.baseVal.value;
    let width, height;
    if (svgImage.getAttribute('width') && svgImage.getAttribute('height')) {
        width = svgImage.width.baseVal.value;
        height = svgImage.height.baseVal.value;
    }
    if (href.startsWith('data:') && href.indexOf('image/svg+xml') !== -1) {
        // data:[<media type>][;charset=<character set>][;base64],<data>
        const dataUrlRegex = /^data:([^,]*),(.*)/;
        const match = dataUrlRegex.exec(href);
        if (match && match.length > 2) {
            const meta = match[1];
            let svgString = match[2];
            const isBase64 = meta.indexOf('base64') !== -1;
            const isUtf8 = meta.indexOf('utf8') !== -1;
            if (isBase64) {
                svgString = btoa(svgString);
            }
            if (!isUtf8) {
                svgString = decodeURIComponent(svgString);
            }
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, 'image/svg+xml');
            const svg = doc.firstElementChild;
            let matrix = context.sourceSvg.createSVGMatrix().translate(x, y);
            matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
            processRoot(context, svg, context.sourceSvg.createSVGTransformFromMatrix(matrix), width, height);
            return;
        }
    }
    else {
        let matrix = context.sourceSvg.createSVGMatrix().translate(x, y);
        matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
        if (context.renderMode === RenderMode.CANVAS) {
            // we just draw the image 'as is' into the canvas
            const dx = matrix.e;
            const dy = matrix.f;
            const img = new Image();
            img.onload = () => {
                if (context.targetCanvasContext) {
                    context.targetCanvasContext.drawImage(img, dx, dy);
                }
            };
            img.src = href;
        }
        else {
            const imageClone = svgImage.cloneNode();
            const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            applyGlobalTransform(context, svgTransform, container);
            container.appendChild(imageClone);
            postProcessElement(context, svgImage, container);
        }
    }
}

function drawLine(context, line, svgTransform) {
    const p1 = new Point(line.x1.baseVal.value, line.y1.baseVal.value);
    const tp1 = applyMatrix(p1, svgTransform);
    const p2 = new Point(line.x2.baseVal.value, line.y2.baseVal.value);
    const tp2 = applyMatrix(p2, svgTransform);
    if (tp1.x === tp2.x && tp1.y === tp2.y) {
        // zero-length line is not rendered
        return;
    }
    const lineSketch = context.rc.line(tp1.x, tp1.y, tp2.x, tp2.y, parseStyleConfig(context, line, svgTransform));
    postProcessElement(context, line, lineSketch);
    drawMarkers(context, line, [p1, p2], svgTransform);
}

function drawPath(context, path, svgTransform) {
    const dataAttrs = path.getAttribute('d');
    const pathData = 
    // Parse path data and convert to absolute coordinates
    new SVGPathData(dataAttrs)
        .toAbs()
        // Normalize H and V to L commands - those cannot work with how we draw transformed paths otherwise
        .transform(SVGPathDataTransformer.NORMALIZE_HVZ())
        // Normalize S and T to Q and C commands - Rough.js has a bug with T where it expects 4 parameters instead of 2
        .transform(SVGPathDataTransformer.NORMALIZE_ST());
    // If there's a transform, transform the whole path accordingly
    const transformedPathData = new SVGPathData(
    // clone the commands, we might need them untransformed for markers
    pathData.commands.map(cmd => Object.assign({}, cmd)));
    if (svgTransform) {
        transformedPathData.transform(SVGPathDataTransformer.MATRIX(svgTransform.matrix.a, svgTransform.matrix.b, svgTransform.matrix.c, svgTransform.matrix.d, svgTransform.matrix.e, svgTransform.matrix.f));
    }
    const encodedPathData = encodeSVGPath(transformedPathData.commands);
    if (encodedPathData.indexOf('undefined') !== -1) {
        // DEBUG STUFF
        console.error('broken path data');
        return;
    }
    postProcessElement(context, path, sketchPath(context, encodedPathData, parseStyleConfig(context, path, svgTransform)));
    // https://www.w3.org/TR/SVG11/painting.html#MarkerProperties
    // Note that for a ‘path’ element which ends with a closed sub-path,
    // the last vertex is the same as the initial vertex on the given
    // sub-path (same applies to polygon).
    const points = [];
    let currentSubPathBegin;
    pathData.commands.forEach(cmd => {
        switch (cmd.type) {
            case SVGPathData.MOVE_TO: {
                const p = new Point(cmd.x, cmd.y);
                points.push(p);
                // each moveto starts a new subpath
                currentSubPathBegin = p;
                break;
            }
            case SVGPathData.LINE_TO:
            case SVGPathData.QUAD_TO:
            case SVGPathData.SMOOTH_QUAD_TO:
            case SVGPathData.CURVE_TO:
            case SVGPathData.SMOOTH_CURVE_TO:
            case SVGPathData.ARC:
                points.push(new Point(cmd.x, cmd.y));
                break;
            case SVGPathData.HORIZ_LINE_TO:
                points.push(new Point(cmd.x, 0));
                break;
            case SVGPathData.VERT_LINE_TO:
                points.push(new Point(0, cmd.y));
                break;
            case SVGPathData.CLOSE_PATH:
                if (currentSubPathBegin) {
                    points.push(currentSubPathBegin);
                }
                break;
        }
    });
    drawMarkers(context, path, points, svgTransform);
}

function drawPolyline(context, polyline, svgTransform) {
    const points = getPointsArray(polyline);
    const transformed = points.map(p => {
        const pt = applyMatrix(p, svgTransform);
        return [pt.x, pt.y];
    });
    const style = parseStyleConfig(context, polyline, svgTransform);
    if (style.fill && style.fill !== 'none') {
        const fillStyle = Object.assign({}, style);
        fillStyle.stroke = 'none';
        postProcessElement(context, polyline, context.rc.polygon(transformed, fillStyle));
    }
    postProcessElement(context, polyline, context.rc.linearPath(transformed, style));
    drawMarkers(context, polyline, points, svgTransform);
}

function drawText(context, text, svgTransform) {
    const stroke = getEffectiveAttribute(context, text, 'stroke');
    const strokeWidth = hasStroke(stroke)
        ? getEffectiveAttribute(context, text, 'stroke-width')
        : null;
    const textAnchor = getEffectiveAttribute(context, text, 'text-anchor', context.useElementContext);
    if (context.renderMode === RenderMode.SVG) {
        const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        container.setAttribute('class', 'text-container');
        applyGlobalTransform(context, svgTransform, container);
        const textClone = text.cloneNode(true);
        if (textClone.transform.baseVal.numberOfItems > 0) {
            // remove transformation, since it is transformed globally by its parent container
            textClone.transform.baseVal.clear();
        }
        const style = textClone.getAttribute('style');
        const cssFont = getCssFont(context, text, true);
        textClone.setAttribute('style', style ? `${style}${style[style.length - 1] === ';' ? '' : ';'}${cssFont}` : cssFont);
        if (hasStroke(stroke)) {
            textClone.setAttribute('stroke', stroke);
        }
        if (strokeWidth) {
            textClone.setAttribute('stroke-width', strokeWidth);
        }
        if (textAnchor) {
            textClone.setAttribute('text-anchor', textAnchor);
        }
        container.appendChild(textClone);
        postProcessElement(context, text, container);
        return;
    }
    const targetCtx = context.targetCanvasContext;
    if (!targetCtx) {
        return;
    }
    targetCtx.save();
    let textLocation = new Point(getLengthInPx(text.x), getLengthInPx(text.y));
    // text style
    targetCtx.font = getCssFont(context, text);
    const style = parseStyleConfig(context, text, svgTransform);
    if (style.fill) {
        targetCtx.fillStyle = style.fill;
    }
    if (hasStroke(stroke)) {
        targetCtx.strokeStyle = stroke;
    }
    if (strokeWidth) {
        targetCtx.lineWidth = convertToPixelUnit(context, strokeWidth);
    }
    if (textAnchor) {
        targetCtx.textAlign = textAnchor !== 'middle' ? textAnchor : 'center';
    }
    // apply the global transform
    applyGlobalTransform(context, svgTransform);
    // consider dx/dy of the text element
    const dx = getLengthInPx(text.dx);
    const dy = getLengthInPx(text.dy);
    targetCtx.translate(dx, dy);
    if (text.childElementCount === 0) {
        targetCtx.fillText(getTextContent(context, text), textLocation.x, textLocation.y, text.getComputedTextLength());
        if (hasStroke(stroke)) {
            targetCtx.strokeText(getTextContent(context, text), textLocation.x, textLocation.y, text.getComputedTextLength());
        }
    }
    else {
        const children = getNodeChildren(text);
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child instanceof SVGTSpanElement) {
                textLocation = new Point(getLengthInPx(child.x), getLengthInPx(child.y));
                const dx = getLengthInPx(child.dx);
                const dy = getLengthInPx(child.dy);
                targetCtx.translate(dx, dy);
                targetCtx.fillText(getTextContent(context, child), textLocation.x, textLocation.y);
                if (hasStroke(stroke)) {
                    targetCtx.strokeText(getTextContent(context, child), textLocation.x, textLocation.y);
                }
            }
        }
    }
    targetCtx.restore();
}
/**
 * @param asStyleString Formats the return value as inline style string
 */
function getCssFont(context, text, asStyleString = false) {
    let cssFont = '';
    const fontStyle = getEffectiveAttribute(context, text, 'font-style', context.useElementContext);
    if (fontStyle) {
        cssFont += asStyleString ? `font-style: ${fontStyle};` : fontStyle;
    }
    const fontWeight = getEffectiveAttribute(context, text, 'font-weight', context.useElementContext);
    if (fontWeight) {
        cssFont += asStyleString ? `font-weight: ${fontWeight};` : ` ${fontWeight}`;
    }
    const fontSize = getEffectiveAttribute(context, text, 'font-size', context.useElementContext);
    if (fontSize) {
        cssFont += asStyleString ? `font-size: ${fontSize};` : ` ${fontSize}`;
    }
    if (context.fontFamily) {
        cssFont += asStyleString ? `font-family: ${context.fontFamily};` : ` ${context.fontFamily}`;
    }
    else {
        const fontFamily = getEffectiveAttribute(context, text, 'font-family', context.useElementContext);
        if (fontFamily) {
            cssFont += asStyleString ? `font-family: ${fontFamily};` : ` ${fontFamily}`;
        }
    }
    cssFont = cssFont.trim();
    return cssFont;
}
/**
 * Retrieves the text content from a text content element (text, tspan, ...)
 */
function getTextContent(context, element) {
    var _a;
    let content = (_a = element.textContent) !== null && _a !== void 0 ? _a : '';
    if (shouldNormalizeWhitespace(context, element)) {
        content = content.replace(/[\n\r\t ]+/g, ' ').trim();
    }
    else {
        content = content.replace(/\r\n|[\n\r\t]/g, ' ');
    }
    return content;
}
/**
 * Determines whether the given element has default white-space handling, i.e. normalization.
 * Returns false if the element (or an ancestor) has xml:space='preserve'
 */
function shouldNormalizeWhitespace(context, element) {
    let xmlSpaceAttribute = null;
    while (element !== null && element !== context.sourceSvg && xmlSpaceAttribute === null) {
        xmlSpaceAttribute = element.getAttribute('xml:space');
        if (xmlSpaceAttribute === null) {
            element = element.parentNode;
        }
    }
    return xmlSpaceAttribute !== 'preserve'; // no attribute is also default handling
}
function hasStroke(stroke) {
    return stroke !== null && stroke !== '';
}

function drawUse(context, use, svgTransform) {
    let href = use.href.baseVal;
    if (href.startsWith('#')) {
        href = href.substring(1);
    }
    const defElement = context.idElements[href];
    if (defElement) {
        let useWidth, useHeight;
        if (use.getAttribute('width') && use.getAttribute('height')) {
            // Use elements can overwrite the width which is important if it is a nested SVG
            useWidth = use.width.baseVal.value;
            useHeight = use.height.baseVal.value;
        }
        // We need to account for x and y attributes as well. Those change where the element is drawn.
        // We can simply change the transform to include that.
        const x = use.x.baseVal.value;
        const y = use.y.baseVal.value;
        let matrix = context.sourceSvg.createSVGMatrix().translate(x, y);
        matrix = svgTransform ? svgTransform.matrix.multiply(matrix) : matrix;
        // the defsElement itself might have a transform that needs to be incorporated
        const elementTransform = context.sourceSvg.createSVGTransformFromMatrix(matrix);
        // use elements must be processed in their context, particularly regarding
        // the styling of them
        if (!context.useElementContext) {
            context.useElementContext = { root: use, referenced: defElement, parentContext: null };
        }
        else {
            const newContext = {
                root: use,
                referenced: defElement,
                parentContext: Object.assign({}, context.useElementContext)
            };
            context.useElementContext = newContext;
        }
        // draw the referenced element
        processRoot(context, defElement, getCombinedTransform(context, defElement, elementTransform), useWidth, useHeight);
        // restore default context
        if (context.useElementContext.parentContext) {
            context.useElementContext = context.useElementContext.parentContext;
        }
        else {
            context.useElementContext = null;
        }
    }
}

/**
 * Traverses the SVG in DFS and draws each element to the canvas.
 * @param root either an SVG- or g-element
 * @param width Use elements can overwrite width
 * @param height Use elements can overwrite height
 */
function processRoot(context, root, svgTransform, width, height) {
    var _a, _b;
    // traverse svg in DFS
    const stack = [];
    if (root instanceof SVGSVGElement ||
        root instanceof SVGSymbolElement ||
        root instanceof SVGMarkerElement) {
        let rootX = 0;
        let rootY = 0;
        if (root instanceof SVGSymbolElement) {
            rootX = parseFloat((_a = root.getAttribute('x')) !== null && _a !== void 0 ? _a : '') || 0;
            rootY = parseFloat((_b = root.getAttribute('y')) !== null && _b !== void 0 ? _b : '') || 0;
            width = width || parseFloat(root.getAttribute('width')) || void 0;
            height = height || parseFloat(root.getAttribute('height')) || void 0;
        }
        else if (root instanceof SVGMarkerElement) {
            rootX = -root.refX.baseVal.value;
            rootY = -root.refY.baseVal.value;
            width = width || parseFloat(root.getAttribute('markerWidth')) || void 0;
            height = height || parseFloat(root.getAttribute('markerHeight')) || void 0;
        }
        else {
            rootX = root.x.baseVal.value;
            rootY = root.y.baseVal.value;
        }
        let rootTransform = context.sourceSvg.createSVGMatrix();
        if (typeof width !== 'undefined' &&
            typeof height !== 'undefined' &&
            root.getAttribute('viewBox')) {
            const { x: viewBoxX, y: viewBoxY, width: viewBoxWidth, height: viewBoxHeight } = root.viewBox.baseVal;
            // viewBox values might scale the SVGs content
            if (root.tagName === 'marker') {
                // refX / refY works differently on markers than the x / y attribute
                rootTransform = rootTransform
                    .translate(-viewBoxX * (width / viewBoxWidth), -viewBoxY * (height / viewBoxHeight))
                    .scaleNonUniform(width / viewBoxWidth, height / viewBoxHeight)
                    .translate(rootX, rootY);
            }
            else {
                rootTransform = rootTransform
                    .translate(-viewBoxX * (width / viewBoxWidth), -viewBoxY * (height / viewBoxHeight))
                    .translate(rootX, rootY)
                    .scaleNonUniform(width / viewBoxWidth, height / viewBoxHeight);
            }
        }
        else {
            rootTransform = rootTransform.translate(rootX, rootY);
        }
        const combinedMatrix = svgTransform
            ? svgTransform.matrix.multiply(rootTransform)
            : rootTransform;
        svgTransform = context.sourceSvg.createSVGTransformFromMatrix(combinedMatrix);
        // don't put the SVG itself into the stack, so start with the children of it
        const children = getNodeChildren(root);
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (child instanceof SVGSymbolElement || child instanceof SVGMarkerElement) {
                // symbols and marker can only be instantiated by specific elements
                continue;
            }
            const childTransform = getCombinedTransform(context, child, svgTransform);
            stack.push({ element: child, transform: childTransform });
        }
    }
    else {
        stack.push({ element: root, transform: svgTransform });
    }
    while (stack.length > 0) {
        const { element, transform } = stack.pop();
        // maybe draw the element
        drawElement(context, element, transform);
        if (element.tagName === 'defs' ||
            element.tagName === 'symbol' ||
            element.tagName === 'marker' ||
            element.tagName === 'svg' ||
            element.tagName === 'clipPath') {
            // Defs are prepocessed separately.
            // Symbols and marker can only be instantiated by specific elements.
            // Don't traverse the SVG element itself. This is done by drawElement -> processRoot.
            // ClipPaths are not drawn and processed separately.
            continue;
        }
        // process children
        const children = getNodeChildren(element);
        for (let i = children.length - 1; i >= 0; i--) {
            const childElement = children[i];
            const newTransform = getCombinedTransform(context, childElement, transform);
            stack.push({ element: childElement, transform: newTransform });
        }
    }
}
function drawRoot(context, element, svgTransform) {
    let width = parseFloat(element.getAttribute('width'));
    let height = parseFloat(element.getAttribute('height'));
    if (isNaN(width) || isNaN(height)) {
        // use only if both are set
        width = height = undefined;
    }
    processRoot(context, element, svgTransform, width, height);
}
/**
 * The main switch to delegate drawing of `SVGElement`s
 * to different subroutines.
 */
function drawElement(context, element, svgTransform) {
    if (isHidden(element)) {
        // just skip hidden elements
        return;
    }
    // possibly apply a clip on the canvas before drawing on it
    const clipPath = element.getAttribute('clip-path');
    if (clipPath) {
        const targetCtx = context.targetCanvasContext;
        if (context.renderMode === RenderMode.CANVAS && targetCtx) {
            targetCtx.save();
        }
        applyClipPath(context, element, clipPath, svgTransform);
    }
    switch (element.tagName) {
        case 'svg':
        case 'symbol':
            drawRoot(context, element, svgTransform);
            break;
        case 'rect':
            drawRect(context, element, svgTransform);
            break;
        case 'path':
            drawPath(context, element, svgTransform);
            break;
        case 'use':
            drawUse(context, element, svgTransform);
            break;
        case 'line':
            drawLine(context, element, svgTransform);
            break;
        case 'circle':
            drawCircle(context, element, svgTransform);
            break;
        case 'ellipse':
            drawEllipse(context, element, svgTransform);
            break;
        case 'polyline':
            drawPolyline(context, element, svgTransform);
            break;
        case 'polygon':
            drawPolygon(context, element, svgTransform);
            break;
        case 'text':
            drawText(context, element, svgTransform);
            break;
        case 'image':
            drawImage(context, element, svgTransform);
            break;
    }
    // re-set the clip for the next element
    if (clipPath) {
        if (context.renderMode === RenderMode.CANVAS && context.targetCanvasContext) {
            context.targetCanvasContext.restore();
        }
    }
}

class SvgTextures {
    static get pencilTextureFilter() {
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'pencilTextureFilter');
        filter.setAttribute('x', '0%');
        filter.setAttribute('y', '0%');
        filter.setAttribute('width', '100%');
        filter.setAttribute('height', '100%');
        filter.setAttribute('filterUnits', 'objectBoundingBox');
        const feTurbulence = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
        feTurbulence.setAttribute('type', 'fractalNoise');
        feTurbulence.setAttribute('baseFrequency', '2');
        feTurbulence.setAttribute('numOctaves', '5');
        feTurbulence.setAttribute('stitchTiles', 'stitch');
        feTurbulence.setAttribute('result', 'f1');
        filter.appendChild(feTurbulence);
        const feColorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
        feColorMatrix.setAttribute('type', 'matrix');
        feColorMatrix.setAttribute('values', '0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1.5 1.5');
        feColorMatrix.setAttribute('result', 'f2');
        filter.appendChild(feColorMatrix);
        const feComposite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
        feComposite.setAttribute('operator', 'in');
        feComposite.setAttribute('in', 'SourceGraphic');
        feComposite.setAttribute('in2', 'f2');
        feComposite.setAttribute('result', 'f3');
        filter.appendChild(feComposite);
        return filter;
    }
}

/**
 * Svg2Roughjs parses a given SVG and draws it with Rough.js
 * in a canvas.
 */
class Svg2Roughjs {
    /**
     * Creates a new instance of Svg2roughjs.
     * @param target Either a selector for the container to which a canvas should be added
     * or an `HTMLCanvasElement` or `SVGSVGElement` that should be used as output target.
     * @param renderMode Whether the output should be an SVG or drawn to an HTML canvas.
     * Defaults to SVG or CANVAS depending if the given target is of type `HTMLCanvasElement` or `SVGSVGElement`,
     * otherwise it defaults to SVG.
     * @param roughjsOptions Config object this passed to the Rough.js ctor and
     * also used while parsing the styles for `SVGElement`s.
     */
    constructor(target, renderMode = RenderMode.SVG, roughjsOptions = {}) {
        this.width = 0;
        this.height = 0;
        this.$backgroundColor = null;
        this.ctx = null;
        this.$pencilFilter = false;
        this.idElements = {};
        if (!target) {
            throw new Error('No target provided');
        }
        if (target instanceof HTMLCanvasElement || target instanceof SVGSVGElement) {
            if (target.tagName === 'canvas' || target.tagName === 'svg') {
                this.canvas = target;
                this.$renderMode = target.tagName === 'canvas' ? RenderMode.CANVAS : RenderMode.SVG;
            }
            else {
                throw new Error('Target object is not of type HTMLCanvasElement or SVGSVGElement');
            }
        }
        else {
            // create a new HTMLCanvasElement or SVGSVGElement as child of the given element
            const container = document.querySelector(target);
            if (!container) {
                throw new Error(`No element found with ${target}`);
            }
            if (renderMode === RenderMode.CANVAS) {
                this.canvas = document.createElement('canvas');
                this.canvas.width = container.clientWidth;
                this.canvas.height = container.clientHeight;
            }
            else {
                this.canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                this.canvas.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                this.canvas.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            }
            this.$renderMode = renderMode;
            container.appendChild(this.canvas);
        }
        this.$roughConfig = roughjsOptions;
        // the Rough.js instance to draw the SVG elements
        if (this.renderMode === RenderMode.CANVAS) {
            const canvas = this.canvas;
            this.rc = rough.canvas(canvas, { options: this.roughConfig });
            // canvas context for convenient access
            this.ctx = canvas.getContext('2d');
        }
        else {
            this.rc = rough.svg(this.canvas, { options: this.roughConfig });
        }
        // default font family
        this.$fontFamily = 'Comic Sans MS, cursive';
        // we randomize the visualization per element by default
        this.$randomize = true;
    }
    /**
     * The SVG that should be converted.
     * Changing this property triggers drawing of the SVG into
     * the canvas or container element with which Svg2Roughjs
     * was initialized.
     */
    set svg(svg) {
        if (this.$svg !== svg) {
            this.$svg = svg;
            if (svg.hasAttribute('width')) {
                this.width = svg.width.baseVal.value;
            }
            else if (svg.hasAttribute('viewBox')) {
                this.width = svg.viewBox.baseVal.width;
            }
            else {
                this.width = 300;
            }
            if (svg.hasAttribute('height')) {
                this.height = svg.height.baseVal.value;
            }
            else if (svg.hasAttribute('viewBox')) {
                this.height = svg.viewBox.baseVal.height;
            }
            else {
                this.height = 150;
            }
            if (this.renderMode === RenderMode.CANVAS && this.ctx) {
                const canvas = this.canvas;
                canvas.width = this.width;
                canvas.height = this.height;
            }
            else {
                const svg = this.canvas;
                svg.setAttribute('width', this.width.toString());
                svg.setAttribute('height', this.height.toString());
            }
            // pre-process defs for subsequent references
            this.collectElementsWithID();
            this.redraw();
        }
    }
    get svg() {
        return this.$svg;
    }
    /**
     * Rough.js config object that is provided to Rough.js for drawing
     * any SVG element.
     * Changing this property triggers a repaint.
     */
    set roughConfig(config) {
        this.$roughConfig = config;
        if (this.renderMode === RenderMode.CANVAS && this.ctx) {
            this.rc = rough.canvas(this.canvas, { options: this.roughConfig });
        }
        else {
            this.rc = rough.svg(this.canvas, { options: this.roughConfig });
        }
        this.redraw();
    }
    get roughConfig() {
        return this.$roughConfig;
    }
    /**
     * Set a font-family for the rendering of text elements.
     * If set to `null`, then the font-family of the SVGTextElement is used.
     * By default, 'Comic Sans MS, cursive' is used.
     * Changing this property triggers a repaint.
     */
    set fontFamily(fontFamily) {
        if (this.$fontFamily !== fontFamily) {
            this.$fontFamily = fontFamily;
            this.redraw();
        }
    }
    get fontFamily() {
        return this.$fontFamily;
    }
    /**
     * Whether to randomize Rough.js' fillWeight, hachureAngle and hachureGap.
     * Also randomizes the disableMultiStroke option of Rough.js.
     * By default true.
     * Changing this property triggers a repaint.
     */
    set randomize(randomize) {
        this.$randomize = randomize;
        this.redraw();
    }
    get randomize() {
        return this.$randomize;
    }
    /**
     * Optional solid background color with which
     * the canvas should be initialized.
     * It is drawn on a transparent canvas by default.
     */
    set backgroundColor(color) {
        this.$backgroundColor = color;
    }
    get backgroundColor() {
        return this.$backgroundColor;
    }
    /**
     * Changes the output format of the converted SVG.
     * Changing this property will replace the current output
     * element with either a new HTML canvas or new SVG element.
     */
    set renderMode(mode) {
        if (this.$renderMode === mode) {
            return;
        }
        this.$renderMode = mode;
        const parent = this.canvas.parentElement;
        parent.removeChild(this.canvas);
        let target;
        if (mode === RenderMode.CANVAS) {
            target = document.createElement('canvas');
            target.width = this.width;
            target.height = this.height;
            this.ctx = target.getContext('2d');
        }
        else {
            this.ctx = null;
            target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            target.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            target.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            target.setAttribute('width', this.width.toString());
            target.setAttribute('height', this.height.toString());
        }
        parent.appendChild(target);
        this.canvas = target;
        if (mode === RenderMode.CANVAS) {
            this.rc = rough.canvas(this.canvas, { options: this.roughConfig });
        }
        else {
            this.rc = rough.svg(this.canvas, { options: this.roughConfig });
        }
        this.redraw();
    }
    get renderMode() {
        return this.$renderMode;
    }
    /**
     * Whether to apply a pencil filter.
     * Only works for SVG render mode.
     */
    set pencilFilter(value) {
        if (this.$pencilFilter !== value) {
            this.$pencilFilter = value;
            this.redraw();
        }
    }
    get pencilFilter() {
        return this.$pencilFilter;
    }
    /**
     * Creates a new context which contains the current state of the
     * Svg2Roughs instance for rendering.
     * @returns A new context.
     */
    createRenderContext() {
        if (!this.$svg) {
            throw new Error('No source SVG set yet.');
        }
        const ctx = {
            rc: this.rc,
            roughConfig: this.roughConfig,
            renderMode: this.renderMode,
            fontFamily: this.fontFamily,
            pencilFilter: this.pencilFilter,
            randomize: this.randomize,
            idElements: this.idElements,
            sourceSvg: this.$svg
        };
        if (this.renderMode === RenderMode.CANVAS && this.ctx) {
            ctx.targetCanvas = this.canvas;
            ctx.targetCanvasContext = this.ctx;
        }
        else {
            ctx.targetSvg = this.canvas;
        }
        return ctx;
    }
    /**
     * Triggers an entire redraw of the SVG which
     * processes the input element anew.
     */
    redraw() {
        if (!this.svg) {
            return;
        }
        // reset target element
        if (this.renderMode === RenderMode.CANVAS) {
            this.initializeCanvas(this.canvas);
        }
        else {
            this.initializeSvg(this.canvas);
        }
        processRoot(this.createRenderContext(), this.svg, null, this.width, this.height);
    }
    /**
     * Prepares the given canvas element depending on the set properties.
     */
    initializeCanvas(canvas) {
        this.ctx = canvas.getContext('2d');
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.width, this.height);
            if (this.backgroundColor) {
                this.ctx.fillStyle = this.backgroundColor;
                this.ctx.fillRect(0, 0, this.width, this.height);
            }
        }
    }
    /**
     * Prepares the given SVG element depending on the set properties.
     */
    initializeSvg(svgElement) {
        // maybe canvas rendering was used before
        this.ctx = null;
        // clear SVG element
        while (svgElement.firstChild) {
            svgElement.removeChild(svgElement.firstChild);
        }
        // apply backgroundColor
        let backgroundElement;
        if (this.backgroundColor) {
            backgroundElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            backgroundElement.width.baseVal.value = this.width;
            backgroundElement.height.baseVal.value = this.height;
            backgroundElement.setAttribute('fill', this.backgroundColor);
            svgElement.appendChild(backgroundElement);
        }
        // prepare filter effects
        if (this.pencilFilter) {
            const defs = getDefsElement(svgElement);
            defs.appendChild(SvgTextures.pencilTextureFilter);
        }
    }
    /**
     * Stores elements with IDs for later use.
     */
    collectElementsWithID() {
        this.idElements = {};
        const elementsWithID = Array.prototype.slice.apply(this.svg.querySelectorAll('*[id]'));
        for (const elt of elementsWithID) {
            const id = elt.getAttribute('id');
            if (id) {
                this.idElements[id] = elt;
            }
        }
    }
}

export { RenderMode, Svg2Roughjs };
//# sourceMappingURL=index.js.map
