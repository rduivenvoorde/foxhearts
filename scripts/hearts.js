
var colors = ['col0', 'col1', 'col2', 'col3'];

function pad(number,length) {
    var str = '' + number;
    while (str.length < length)
        str = ' ' + str;
    return str;
}

View = function(div, matrix){
    this.matrix = matrix;
    this.div = div;
    this.render();
    this.clicks=0;
    this.score=0;

    that = this;

    function is_touch_device() {
      return 'ontouchstart' in window // works on most browsers 
            || 'onmsgesturechange' in window; // works on ie10
    };
    var actionEvent = 'click';
    if (is_touch_device()){
        actionEvent = 'touchstart';
    }
    $('#btn_bigger').on(actionEvent, function(evt){ 
        var size = 1.3*parseInt($('.item').css('width'));
        $('.item').css('width', size).css('height', size);
    });
    $('#btn_renew').on(actionEvent, function(evt){
        // TODO move renew / init to ???
        renew();
    });
    $('.item').on(actionEvent, function(evt){
        that.clicks++;
        var item = $(this);
        // rc = row column
        var rc = item.attr('id').split('_');
        var c = rc[0];
        var r = rc[1];
        var h = that.matrix.mtx[r][c];
        //console.log(r, c, h)
        // deep copy
        matrix.pushState();
        var hits = matrix.flood(r, c, h);
        // TODO move this to Matrix (combined history: mtx, hearts, score)
        $('#score_hearts').html(hits);
        if (hits==1){
            //restore
            matrix.popState();
            hits=0;
        }
        var value = (hits-1)*(hits-1);

        $('#score_hearts').html(hits);
        $('#score_value').html(value);
        that.score+=value;
        $('#score_score').html(that.score);
        $('#score_index').html(that.score/that.clicks);
        //console.time('render');
        //that.render();  // <= not needed?
        //console.timeEnd('render');
        matrix.collapse();
        that.render();
        //console.log(matrix.mtx);
        if (matrix.isfinished()){
            $('#score_message').html("FINISHED, no more moves to play...").removeClass().addClass('red');
        }
    });
}

View.prototype.toString = function(withBuffer){
    return this.matrix.toString(withBuffer);
}

View.prototype.render = function(){
    for (var i=1;i<this.matrix.rows+1;i++){
        // create a new row if not already available
        if($('#row'+i).length==0){
            this.div.append($('<div id="row'+i+'" class="row"></div>'));
        }
        for (var j=1;j<this.matrix.cols+1;j++){ 
            var color = this.matrix.mtx[j][i];
            var rendertype = 'IMG';  // CSS, SVG, IMG
            var cell = $('#'+i+'_'+j);
            if(cell.length==0){
                // create a fresh cell
                if (rendertype == 'CSS'){
                    // working css
                    $('#row'+i).append($('<div class="item" id="'+i+'_'+j+'"><div class="heart ' + colors[color] + '"></div></div>'));
                }
                else if (rendertype == 'SVG'){
                    // working svg
                    $('#row'+i).append($('<div class="item" id="'+i+'_'+j+'"><svg xmlns="http://www.w3.org/2000/svg"><g><use class="heart"  xlink:href="#col'+color+'"/></g></svg></div>'));
                }
                else if (rendertype == 'IMG'){
                    // working image
                    // TODO preload img
                    $('#row'+i).append($('<div class="item" id="'+i+'_'+j+'"><img src="images/heart.png" class="heart ' + colors[color] + '"/></div>'));
                }
            }
            else{
                // heart is here the element that renders the heart (CSS, SVG or IMG)
                var heart = $($('#'+i+'_'+j).find('.heart')[0]);
                // remove all classes and set the right color
                heart.removeClass();
                heart.addClass('heart');
                if (color>=0){
                    // *** CSS version ***
                    heart.addClass(colors[color]);
                    // *** SVG version ***
                    heart.attr('xlink:href', '#col'+color)
                }
                else{
                    // *** SVG version ***
                    heart.attr('xlink:href', '#none')
                }
            }
        }
    }
}

Matrix = function(rows, cols){
    this.rows = rows;
    this.cols = cols;
    // create matrix with a buffer around it filled with -1
    this.mtx = [];
    this.history = new Array(10);
    for (var i=0;i<cols+2;i++){
        var x = [];
        for (var j=0;j<rows+2;j++){
            x.push(-1);
        }
        this.mtx.push(x);
    }
    for (var i=1;i<cols+1;i++){
        for (var j=1;j<rows+1;j++){
            var val = Math.floor((Math.random() * colors.length));
            this.mtx[i][j]=val;
        }
    }
}
Matrix.prototype.toString = function(){
    this.toString(true);
}
Matrix.prototype.toString = function(withBuffer){
    var s = []
    var colstart = 1, colend=1;
    var rowstart = 1, rowend=1;
    if (withBuffer){
        colstart = 0, colend=2;
        rowstart = 0, rowend=2;
    }
    for (var i=rowstart;i<this.rows+rowend;i++){
        var r='';
        for (var j=colstart;j<this.cols+colend;j++){
            r+=(pad(this.mtx[j][i],2)+', ');
        }
        s.push( r );
    }
    return s.join("\n\n");
}
Matrix.prototype.pushState = function(){
    var m = $.extend(true, [], this.mtx);
    //var m = JSON.decode(JSON.encode(this.mtx));
    this.history.push(m);
    this.history.shift();
}
Matrix.prototype.popState = function(){
    var m = this.history.pop();
    this.history.unshift(undefined);
    if (m==undefined){
        // we return a copy of current version
        m = $.extend(true, [], this.mtx); // <== deep copy of object
        //m = JSON.decode(JSON.encode(this.mtx));
    }
    this.mtx = null;
    this.mtx = m;
    return m;
}
Matrix.prototype.flood = function(row, col, c){
    //console.log('flood: ', row, col, c)
    if (this.mtx[row][col]!=c){
        return 0;
    }
    //console.log(this.mtx)
    this.mtx[row][col]=(-1);
    //console.log(this.mtx)
    row = parseInt(row);
    col = parseInt(col);
    var hits = 1+this.flood(row-1,col,c)+this.flood(row+1,col,c)+this.flood(row,col-1,c)+this.flood(row,col+1,c);
    return hits;
}
Matrix.prototype.collapse = function(){
    // detect empty cell, and collapse down (adding -1 to top)
    for (var c=this.cols+1;c>0;c--){ // going from back to front!
        var col = this.mtx[c];
        for (var i=1;i<this.rows+1;i++){
            if(col[i]==-1){
                // splice removes this element and returns that element
                // unshift puts that element in front of the array
                // NOTE:  splice returns an array(!) hence [0]
                col.unshift(col.splice(i,1)[0]);
            }
        }
    }
    // detect empty columns, and if collapse to left
    function isEmpty(element, index, array){
        return element == -1;
    }
    for (var c=this.cols+1;c>0;c--){ // going from back to front!
        if (this.mtx[c].every(isEmpty)){
            // splice removes this element and returns that element
            // push adds that element to the front of the array with columns
            // NOTE:  splice returns an array(!) hence [0]
            this.mtx.push(this.mtx.splice(c,1)[0]);
        }
    }
    return;
}
Matrix.prototype.isfinished = function(){
    var finished = true;
    // going over all cells, checking if either the next on this row, or the
    // next in this column is the same value (and NOT -1)
    for (var row=1;row<this.rows+1;row++){
        for (var col=1;col<this.cols+1;col++){
            if (this.mtx[row][col]>=0 && 
                (this.mtx[row][col]==this.mtx[row+1][col] || this.mtx[row][col]==this.mtx[row][col+1])){
                return false;
            }
        }
    }
    return finished;
}

function renew(){
    //m = new Matrix(15,15);
    m = new Matrix(13,10);
    //m = new Matrix(4,4);
    //m = new Matrix(6,6);
    //m = new Matrix(2,2);
    v = new View($('#matrix'), m);
    //console.log(m.toString());
}

$( document ).ready(function() {
    renew();
});
