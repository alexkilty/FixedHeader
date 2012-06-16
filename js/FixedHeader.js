/*
 * File:        FixedHeader.js
 * Version:     2.1.0.dev
 * Description: "Fix" a header at the top of the table, so it scrolls with the table
 * Author:      Allan Jardine (www.sprymedia.co.uk)
 * Created:     Wed 16 Sep 2009 19:46:30 BST
 * Language:    Javascript
 * License:     GPL v2 or BSD 3 point style
 * Project:     Just a little bit of fun - enjoy :-)
 * Contact:     www.sprymedia.co.uk/contact
 * 
 * Copyright 2009-2012 Allan Jardine, all rights reserved.
 *
 * This source file is free software, under either the GPL v2 license or a
 * BSD style license, available at:
 *   http://datatables.net/license_gpl2
 *   http://datatables.net/license_bsd
 */

/* Global scope for FixedColumns */
var FixedHeader;


(function(window, document, $) {

/*
 * Function: FixedHeader
 * Purpose:  Provide 'fixed' header, footer and columns on an HTML table
 * Returns:  object:FixedHeader - must be called with 'new'
 * Inputs:   mixed:mTable - target table
 *					   1. DataTable object - when using FixedHeader with DataTables, or
 *					   2. HTML table node - when using FixedHeader without DataTables
 *           object:oInit - initialisation settings, with the following properties (each optional)
 *             bool:top -    fix the header (default true)
 *             bool:bottom - fix the footer (default false)
 *             bool:left -   fix the left most column (default false)
 *             bool:right -  fix the right most column (default false)
 *             int:zTop -    fixed header zIndex
 *             int:zBottom - fixed footer zIndex
 *             int:zLeft -   fixed left zIndex
 *             int:zRight -  fixed right zIndex
 */
FixedHeader = function ( mTable, oInit ) {
	/* Sanity check - you just know it will happen */
	if ( typeof this.fnInit != 'function' )
	{
		alert( "FixedHeader warning: FixedHeader must be initialised with the 'new' keyword." );
		return;
	}
	
	var that = this;
	var oSettings = {
		"aoCache": [],
		"oSides": {
			"top": true,
			"bottom": false,
			"left": false,
			"right": false
		},
		"oZIndexes": {
			"top": 104,
			"bottom": 103,
			"left": 102,
			"right": 101
		},
		"oCloneOnDraw": {
			"top": false,
			"bottom": false,
			"left": true,
			"right": true
		},
		"oMes": {
			"iTableWidth": 0,
			"iTableHeight": 0,
			"iTableLeft": 0,
			"iTableRight": 0, /* note this is left+width, not actually "right" */
			"iTableTop": 0,
			"iTableBottom": 0 /* note this is top+height, not actually "bottom" */
		},
		"oOffset": {
			"top": 0
		},
		"nTable": null,
		"bUseAbsPos": false,
		"bFooter": false,
		"bInitComplete": false
	};
	
	/*
	 * Function: fnGetSettings
	 * Purpose:  Get the settings for this object
	 * Returns:  object: - settings object
	 * Inputs:   -
	 */
	this.fnGetSettings = function () {
		return oSettings;
	};
	
	/*
	 * Function: fnUpdate
	 * Purpose:  Update the positioning and copies of the fixed elements
	 * Returns:  -
	 * Inputs:   -
	 */
	this.fnUpdate = function () {
		this._fnUpdateClones();
		this._fnUpdatePositions();
	};
	
	/*
	 * Function: fnPosition
	 * Purpose:  Update the positioning of the fixed elements
	 * Returns:  -
	 * Inputs:   -
	 */
	this.fnPosition = function () {
		this._fnUpdatePositions();
	};
	
	/* Let's do it */
	this.fnInit( mTable, oInit );
	
	/* Store the instance on the DataTables object for easy access */
	if ( typeof mTable.fnSettings == 'function' )
	{
		mTable._oPluginFixedHeader = this;
	}
};


/*
 * Variable: FixedHeader
 * Purpose:  Prototype for FixedHeader
 * Scope:    global
 */
FixedHeader.prototype = {
	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * Initialisation
	 */
	
	/*
	 * Function: fnInit
	 * Purpose:  The "constructor"
	 * Returns:  -
	 * Inputs:   {as FixedHeader function}
	 */
	fnInit: function ( oTable, oInit )
	{
		var s = this.fnGetSettings();
		var that = this;
		
		/* Record the user definable settings */
		this.fnInitSettings( s, oInit );
		
		/* DataTables specific stuff */
		if ( typeof oTable.fnSettings == 'function' )
		{
			if ( typeof oTable.fnVersionCheck == 'functon' &&
			     oTable.fnVersionCheck( '1.6.0' ) !== true )
			{
				alert( "FixedHeader 2 required DataTables 1.6.0 or later. "+
					"Please upgrade your DataTables installation" );
				return;
			}
			
			var oDtSettings = oTable.fnSettings();
			
			if ( oDtSettings.oScroll.sX != "" || oDtSettings.oScroll.sY != "" )
			{
				alert( "FixedHeader 2 is not supported with DataTables' scrolling mode at this time" );
				return;
			}
			
			s.nTable = oDtSettings.nTable;
			oDtSettings.aoDrawCallback.unshift( {
				"fn": function () {
					FixedHeader.fnMeasure();
					that._fnUpdateClones.call(that);
					that._fnUpdatePositions.call(that);
				},
				"sName": "FixedHeader"
			} );
		}
		else
		{
			s.nTable = oTable;
		}
		
		s.bFooter = ($('>tfoot', s.nTable).length > 0) ? true : false;
		
		/* "Detect" browsers that don't support absolute positioing - or have bugs */
		s.bUseAbsPos = ($.browser.msie && ($.browser.version=="6.0"||$.browser.version=="7.0"));
		
		/* Add the 'sides' that are fixed */
		if ( s.oSides.top )
		{
			s.aoCache.push( that._fnCloneTable( "fixedHeader", "FixedHeader_Header", that._fnCloneThead ) );
		}
		if ( s.oSides.bottom )
		{
			s.aoCache.push( that._fnCloneTable( "fixedFooter", "FixedHeader_Footer", that._fnCloneTfoot ) );
		}
		if ( s.oSides.left )
		{
			s.aoCache.push( that._fnCloneTable( "fixedLeft", "FixedHeader_Left", that._fnCloneTLeft ) );
		}
		if ( s.oSides.right )
		{
			s.aoCache.push( that._fnCloneTable( "fixedRight", "FixedHeader_Right", that._fnCloneTRight ) );
		}
		
		/* Event listeners for window movement */
		FixedHeader.afnScroll.push( function () {
			that._fnUpdatePositions.call(that);
		} );
		
		$(window).resize( function () {
			FixedHeader.fnMeasure();
			that._fnUpdateClones.call(that);
			that._fnUpdatePositions.call(that);
		} );
		
		/* Get things right to start with */
		FixedHeader.fnMeasure();
		that._fnUpdateClones();
		that._fnUpdatePositions();

		s.bInitComplete = true;
	},
	
	
	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * Support functions
	 */
	
	/*
	 * Function: fnInitSettings
	 * Purpose:  Take the user's settings and copy them to our local store
	 * Returns:  -
	 * Inputs:   object:s - the local settings object
	 *           object:oInit - the user's settings object
	 */
	fnInitSettings: function ( s, oInit )
	{
		if ( typeof oInit != 'undefined' )
		{
			if ( typeof oInit.top != 'undefined' ) {
				s.oSides.top = oInit.top;
			}
			if ( typeof oInit.bottom != 'undefined' ) {
				s.oSides.bottom = oInit.bottom;
			}
			if ( typeof oInit.left != 'undefined' ) {
				s.oSides.left = oInit.left;
			}
			if ( typeof oInit.right != 'undefined' ) {
				s.oSides.right = oInit.right;
			}
			
			if ( typeof oInit.zTop != 'undefined' ) {
				s.oZIndexes.top = oInit.zTop;
			}
			if ( typeof oInit.zBottom != 'undefined' ) {
				s.oZIndexes.bottom = oInit.zBottom;
			}
			if ( typeof oInit.zLeft != 'undefined' ) {
				s.oZIndexes.left = oInit.zLeft;
			}
			if ( typeof oInit.zRight != 'undefined' ) {
				s.oZIndexes.right = oInit.zRight;
			}

			if ( typeof oInit.offsetTop != 'undefined' ) {
				s.oOffset.top = oInit.offsetTop;
			}
			if ( typeof oInit.alwaysCloneTop != 'undefined' ) {
				s.oCloneOnDraw.top = oInit.alwaysCloneTop;
			}
			if ( typeof oInit.alwaysCloneBottom != 'undefined' ) {
				s.oCloneOnDraw.bottom = oInit.alwaysCloneBottom;
			}
			if ( typeof oInit.alwaysCloneLeft != 'undefined' ) {
				s.oCloneOnDraw.left = oInit.alwaysCloneLeft;
			}
			if ( typeof oInit.alwaysCloneRight != 'undefined' ) {
				s.oCloneOnDraw.right = oInit.alwaysCloneRight;
			}
		}
		
		/* Detect browsers which have poor position:fixed support so we can use absolute positions.
		 * This is much slower since the position must be updated for each scroll, but widens
		 * compatibility
		 */
		s.bUseAbsPos = ($.browser.msie && 
			($.browser.version=="6.0"||$.browser.version=="7.0"));
	},
	
	/*
	 * Function: _fnCloneTable
	 * Purpose:  Clone the table node and do basic initialisation
	 * Returns:  -
	 * Inputs:   -
	 */
	_fnCloneTable: function ( sType, sClass, fnClone )
	{
		var s = this.fnGetSettings();
		var nCTable;
		
		/* We know that the table _MUST_ has a DIV wrapped around it, because this is simply how
		 * DataTables works. Therefore, we can set this to be relatively position (if it is not
		 * alreadu absolute, and use this as the base point for the cloned header
		 */
		if ( $(s.nTable.parentNode).css('position') != "absolute" )
		{
			s.nTable.parentNode.style.position = "relative";
		}
		
		/* Just a shallow clone will do - we only want the table node */
		nCTable = s.nTable.cloneNode( false );
		nCTable.removeAttribute( 'id' );
		
		var nDiv = document.createElement( 'div' );
		nDiv.style.position = "absolute";
		nDiv.style.top = "0px";
		nDiv.style.left = "0px";
		nDiv.className += " FixedHeader_Cloned "+sType+" "+sClass;
		
		/* Set the zIndexes */
		if ( sType == "fixedHeader" )
		{
			nDiv.style.zIndex = s.oZIndexes.top;
		}
		if ( sType == "fixedFooter" )
		{
			nDiv.style.zIndex = s.oZIndexes.bottom;
		}
		if ( sType == "fixedLeft" )
		{
			nDiv.style.zIndex = s.oZIndexes.left;
		}
		else if ( sType == "fixedRight" )
		{
			nDiv.style.zIndex = s.oZIndexes.right;
		}

		/* remove margins since we are going to position it absolutely */
		nCTable.style.margin = "0";
		
		/* Insert the newly cloned table into the DOM, on top of the "real" header */
		nDiv.appendChild( nCTable );
		document.body.appendChild( nDiv );
		
		return {
			"nNode": nCTable,
			"nWrapper": nDiv,
			"sType": sType,
			"sPosition": "",
			"sTop": "",
			"sLeft": "",
			"fnClone": fnClone
		};
	},
	
	/*
	 * Function: _fnUpdatePositions
	 * Purpose:  Get the current positioning of the table in the DOM
	 * Returns:  -
	 * Inputs:   -
	 */
	_fnMeasure: function ()
	{
		var
			s = this.fnGetSettings(),
			m = s.oMes,
			jqTable = $(s.nTable),
			oOffset = jqTable.offset(),
			iParentScrollTop = this._fnSumScroll( s.nTable.parentNode, 'scrollTop' ),
			iParentScrollLeft = this._fnSumScroll( s.nTable.parentNode, 'scrollLeft' );
		
		m.iTableWidth = jqTable.outerWidth();
		m.iTableHeight = jqTable.outerHeight();
		m.iTableLeft = oOffset.left + s.nTable.parentNode.scrollLeft;
		m.iTableTop = oOffset.top + iParentScrollTop;
		m.iTableRight = m.iTableLeft + m.iTableWidth;
		m.iTableRight = FixedHeader.oDoc.iWidth - m.iTableLeft - m.iTableWidth;
		m.iTableBottom = FixedHeader.oDoc.iHeight - m.iTableTop - m.iTableHeight;
	},
	
	/*
	 * Function: _fnSumScroll
	 * Purpose:  Sum node parameters all the way to the top
	 * Returns:  int: sum
	 * Inputs:   node:n - node to consider
	 *           string:side - scrollTop or scrollLeft
	 */
	_fnSumScroll: function ( n, side )
	{
		var i = n[side];
		while ( n = n.parentNode )
		{
			if ( n.nodeName == 'HTML' || n.nodeName == 'BODY' )
			{
				break;
			}
			i = n[side];
		}
		return i;
	},
	
	/*
	 * Function: _fnUpdatePositions
	 * Purpose:  Loop over the fixed elements for this table and update their positions
	 * Returns:  -
	 * Inputs:   -
	 */
	_fnUpdatePositions: function ()
	{
		var s = this.fnGetSettings();
		this._fnMeasure();
		
		for ( var i=0, iLen=s.aoCache.length ; i<iLen ; i++ )
		{
			if ( s.aoCache[i].sType == "fixedHeader" )
			{
				this._fnScrollFixedHeader( s.aoCache[i] );
			}
			else if ( s.aoCache[i].sType == "fixedFooter" )
			{
				this._fnScrollFixedFooter( s.aoCache[i] );
			}
			else if ( s.aoCache[i].sType == "fixedLeft" )
			{
				this._fnScrollHorizontalLeft( s.aoCache[i] );
			}
			else
			{
				this._fnScrollHorizontalRight( s.aoCache[i] );
			}
		}
	},
	
	/*
	 * Function: _fnUpdateClones
	 * Purpose:  Loop over the fixed elements for this table and call their cloning functions
	 * Returns:  -
	 * Inputs:   -
	 */
	_fnUpdateClones: function ()
	{
		var s = this.fnGetSettings();
		for ( var i=0, iLen=s.aoCache.length ; i<iLen ; i++ )
		{
			s.aoCache[i].fnClone.call( this, s.aoCache[i] );
		}
	},
	
	
	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * Scrolling functions
	 */
	
	/*
	 * Function: _fnScrollHorizontalLeft
	 * Purpose:  Update the positioning of the scrolling elements
	 * Returns:  -
	 * Inputs:   object:oCache - the cached values for this fixed element
	 */
	_fnScrollHorizontalRight: function ( oCache )
	{
		var
			s = this.fnGetSettings(),
			oMes = s.oMes,
			oWin = FixedHeader.oWin,
			oDoc = FixedHeader.oDoc,
			nTable = oCache.nWrapper,
			iFixedWidth = $(nTable).outerWidth();
		
		if ( oWin.iScrollRight < oMes.iTableRight )
		{
			/* Fully right aligned */
			this._fnUpdateCache( oCache, 'sPosition', 'absolute', 'position', nTable.style );
			this._fnUpdateCache( oCache, 'sTop', oMes.iTableTop+"px", 'top', nTable.style );
			this._fnUpdateCache( oCache, 'sLeft', (oMes.iTableLeft+oMes.iTableWidth-iFixedWidth)+"px", 'left', nTable.style );	
		}
		else if ( oMes.iTableLeft < oDoc.iWidth-oWin.iScrollRight-iFixedWidth )
		{
			/* Middle */
			if ( s.bUseAbsPos )
			{
				this._fnUpdateCache( oCache, 'sPosition', 'absolute', 'position', nTable.style );
				this._fnUpdateCache( oCache, 'sTop', oMes.iTableTop+"px", 'top', nTable.style );
				this._fnUpdateCache( oCache, 'sLeft', (oDoc.iWidth-oWin.iScrollRight-iFixedWidth)+"px", 'left', nTable.style );
			}
			else
			{
				this._fnUpdateCache( oCache, 'sPosition', 'fixed', 'position', nTable.style );
				this._fnUpdateCache( oCache, 'sTop', (oMes.iTableTop-oWin.iScrollTop)+"px", 'top', nTable.style );
				this._fnUpdateCache( oCache, 'sLeft', (oWin.iWidth-iFixedWidth)+"px", 'left', nTable.style );
			}	
		}
		else
		{
			/* Fully left aligned */
			this._fnUpdateCache( oCache, 'sPosition', 'absolute', 'position', nTable.style );
			this._fnUpdateCache( oCache, 'sTop', oMes.iTableTop+"px", 'top', nTable.style );
			this._fnUpdateCache( oCache, 'sLeft', oMes.iTableLeft+"px", 'left', nTable.style );	
		}
	},
	
	/*
	 * Function: _fnScrollHorizontalLeft
	 * Purpose:  Update the positioning of the scrolling elements
	 * Returns:  -
	 * Inputs:   object:oCache - the cached values for this fixed element
	 */
	_fnScrollHorizontalLeft: function ( oCache )
	{
		var
			s = this.fnGetSettings(),
			oMes = s.oMes,
			oWin = FixedHeader.oWin,
			oDoc = FixedHeader.oDoc,
			nTable = oCache.nWrapper,
			iCellWidth = $(nTable).outerWidth();
		
		if ( oWin.iScrollLeft < oMes.iTableLeft )
		{
			/* Fully left align */
			this._fnUpdateCache( oCache, 'sPosition', 'absolute', 'position', nTable.style );
			this._fnUpdateCache( oCache, 'sTop', oMes.iTableTop+"px", 'top', nTable.style );
			this._fnUpdateCache( oCache, 'sLeft', oMes.iTableLeft+"px", 'left', nTable.style );	
		}
		else if ( oWin.iScrollLeft < oMes.iTableLeft+oMes.iTableWidth-iCellWidth )
		{
			/* Middle */
			if ( s.bUseAbsPos )
			{
				this._fnUpdateCache( oCache, 'sPosition', 'absolute', 'position', nTable.style );
				this._fnUpdateCache( oCache, 'sTop', oMes.iTableTop+"px", 'top', nTable.style );
				this._fnUpdateCache( oCache, 'sLeft', oWin.iScrollLeft+"px", 'left', nTable.style );
			}
			else
			{
				this._fnUpdateCache( oCache, 'sPosition', 'fixed', 'position', nTable.style );
				this._fnUpdateCache( oCache, 'sTop', (oMes.iTableTop-oWin.iScrollTop)+"px", 'top', nTable.style );
				this._fnUpdateCache( oCache, 'sLeft', "0px", 'left', nTable.style );
			}	
		}
		else
		{
			/* Fully right align */
			this._fnUpdateCache( oCache, 'sPosition', 'absolute', 'position', nTable.style );
			this._fnUpdateCache( oCache, 'sTop', oMes.iTableTop+"px", 'top', nTable.style );
			this._fnUpdateCache( oCache, 'sLeft', (oMes.iTableLeft+oMes.iTableWidth-iCellWidth)+"px", 'left', nTable.style );	
		}
	},
	
	/*
	 * Function: _fnScrollFixedFooter
	 * Purpose:  Update the positioning of the scrolling elements
	 * Returns:  -
	 * Inputs:   object:oCache - the cached values for this fixed element
	 */
	_fnScrollFixedFooter: function ( oCache )
	{
		var
			s = this.fnGetSettings(),
			oMes = s.oMes,
			oWin = FixedHeader.oWin,
			oDoc = FixedHeader.oDoc,
			nTable = oCache.nWrapper,
			iTheadHeight = $("thead", s.nTable).outerHeight(),
			iCellHeight = $(nTable).outerHeight();
		
		if ( oWin.iScrollBottom < oMes.iTableBottom )
		{
			/* Below */
			this._fnUpdateCache( oCache, 'sPosition', 'absolute', 'position', nTable.style );
			this._fnUpdateCache( oCache, 'sTop', (oMes.iTableTop+oMes.iTableHeight-iCellHeight)+"px", 'top', nTable.style );
			this._fnUpdateCache( oCache, 'sLeft', oMes.iTableLeft+"px", 'left', nTable.style );	
		}
		else if ( oWin.iScrollBottom < oMes.iTableBottom+oMes.iTableHeight-iCellHeight-iTheadHeight )
		{
			/* Middle */
			if ( s.bUseAbsPos )
			{
				this._fnUpdateCache( oCache, 'sPosition', "absolute", 'position', nTable.style );
				this._fnUpdateCache( oCache, 'sTop', (oDoc.iHeight-oWin.iScrollBottom-iCellHeight)+"px", 'top', nTable.style );
				this._fnUpdateCache( oCache, 'sLeft', oMes.iTableLeft+"px", 'left', nTable.style );
			}
			else
			{
				this._fnUpdateCache( oCache, 'sPosition', 'fixed', 'position', nTable.style );
				this._fnUpdateCache( oCache, 'sTop', (oWin.iHeight-iCellHeight)+"px", 'top', nTable.style );
				this._fnUpdateCache( oCache, 'sLeft', (oMes.iTableLeft-oWin.iScrollLeft)+"px", 'left', nTable.style );	
			}
		}
		else
		{
			/* Above */
			this._fnUpdateCache( oCache, 'sPosition', 'absolute', 'position', nTable.style );
			this._fnUpdateCache( oCache, 'sTop', (oMes.iTableTop+iCellHeight)+"px", 'top', nTable.style );
			this._fnUpdateCache( oCache, 'sLeft', oMes.iTableLeft+"px", 'left', nTable.style );	
		}
	},
	
	/*
	 * Function: _fnScrollFixedHeader
	 * Purpose:  Update the positioning of the scrolling elements
	 * Returns:  -
	 * Inputs:   object:oCache - the cached values for this fixed element
	 */
	_fnScrollFixedHeader: function ( oCache )
	{
		var
			s = this.fnGetSettings(),
			oMes = s.oMes,
			oWin = FixedHeader.oWin,
			oDoc = FixedHeader.oDoc,
			nTable = oCache.nWrapper,
			iTbodyHeight = 0,
			anTbodies = s.nTable.getElementsByTagName('tbody');

		for (var i = 0; i < anTbodies.length; ++i) {
			iTbodyHeight += anTbodies[i].offsetHeight;
		}

		if ( oMes.iTableTop > oWin.iScrollTop + s.oOffset.top )
		{
			/* Above the table */
			this._fnUpdateCache( oCache, 'sPosition', "absolute", 'position', nTable.style );
			this._fnUpdateCache( oCache, 'sTop', oMes.iTableTop+"px", 'top', nTable.style );
			this._fnUpdateCache( oCache, 'sLeft', oMes.iTableLeft+"px", 'left', nTable.style );
		}
		else if ( oWin.iScrollTop + s.oOffset.top > oMes.iTableTop+iTbodyHeight )
		{
			/* At the bottom of the table */
			this._fnUpdateCache( oCache, 'sPosition', "absolute", 'position', nTable.style );
			this._fnUpdateCache( oCache, 'sTop', (oMes.iTableTop+iTbodyHeight)+"px", 'top', nTable.style );
			this._fnUpdateCache( oCache, 'sLeft', oMes.iTableLeft+"px", 'left', nTable.style );
		}
		else
		{
			/* In the middle of the table */
			if ( s.bUseAbsPos )
			{
				this._fnUpdateCache( oCache, 'sPosition', "absolute", 'position', nTable.style );
				this._fnUpdateCache( oCache, 'sTop', oWin.iScrollTop+"px", 'top', nTable.style );
				this._fnUpdateCache( oCache, 'sLeft', oMes.iTableLeft+"px", 'left', nTable.style );
			}
			else
			{
				this._fnUpdateCache( oCache, 'sPosition', 'fixed', 'position', nTable.style );
				this._fnUpdateCache( oCache, 'sTop', s.oOffset.top+"px", 'top', nTable.style );
				this._fnUpdateCache( oCache, 'sLeft', (oMes.iTableLeft-oWin.iScrollLeft)+"px", 'left', nTable.style );
			}
		}
	},
	
	/*
	 * Function: _fnUpdateCache
	 * Purpose:  Check the cache and update cache and value if needed
	 * Returns:  -
	 * Inputs:   object:oCache - local cache object
	 *           string:sCache - cache property
	 *           string:sSet - value to set
	 *           string:sProperty - object property to set
	 *           object:oObj - object to update
	 */
	_fnUpdateCache: function ( oCache, sCache, sSet, sProperty, oObj )
	{
		if ( oCache[sCache] != sSet )
		{
			oObj[sProperty] = sSet;
			oCache[sCache] = sSet;
		}
	},
	


	/**
	 * Copy the classes of all child nodes from one element to another. This implies
	 * that the two have identical structure - no error checking is performed to that
	 * fact.
	 *  @param {element} source Node to copy classes from
	 *  @param {element} dest Node to copy classes too
	 */
	_fnClassUpdate: function ( source, dest )
	{
		var that = this;

		if ( source.nodeName.toUpperCase() === "TR" || source.nodeName.toUpperCase() === "TH" || 
			 source.nodeName.toUpperCase() === "TD" || source.nodeName.toUpperCase() === "SPAN" )
		{
			dest.className = source.className;
		}

		$(source).children().each( function (i) {
			that._fnClassUpdate( $(source).children()[i], $(dest).children()[i] );
		} );
	},
	
	
	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * Cloning functions
	 */
	
	/*
	 * Function: _fnCloneThead
	 * Purpose:  Clone the thead element
	 * Returns:  -
	 * Inputs:   object:oCache - the cached values for this fixed element
	 */
	_fnCloneThead: function ( oCache )
	{
		var s = this.fnGetSettings();
		var nTable = oCache.nNode;

		if ( s.bInitComplete && !s.oCloneOnDraw.top )
		{
			this._fnClassUpdate( $('thead', s.nTable)[0], $('thead', nTable)[0] );
			return;
		}
		
		/* Set the wrapper width to match that of the cloned table */
		var iDtWidth = $(s.nTable).outerWidth();
		oCache.nWrapper.style.width = iDtWidth+"px";
		nTable.style.width = iDtWidth+"px";
		
		/* Remove any children the cloned table has */
		while ( nTable.childNodes.length > 0 )
		{
			$('thead th', nTable).unbind( 'click' );
			nTable.removeChild( nTable.childNodes[0] );
		}
		
		/* Clone the DataTables header */
		var nThead = $('thead', s.nTable).clone(true)[0];
		nTable.appendChild( nThead );
		
		/* Copy the widths across - apparently a clone isn't good enough for this */
		var a = [];
		var b = [];

		jQuery("thead>tr th", s.nTable).each( function (i) {
			a.push( jQuery(this).width() );
		} );
		
		jQuery("thead>tr td", s.nTable).each( function (i) {
			b.push( jQuery(this).width() );
		} );

		jQuery("thead>tr th", s.nTable).each( function (i) {
			jQuery("thead>tr th:eq("+i+")", nTable).width( a[i] );
			$(this).width( a[i] );
		} );
		
		jQuery("thead>tr td", s.nTable).each( function (i) {
			jQuery("thead>tr td:eq("+i+")", nTable).width( b[i] );
			$(this).width( b[i] );
		} );

		// Stop DataTables 1.9 from putting a focus ring on the headers when
		// clicked to sort
		$('th.sorting, th.sorting_desc, th.sorting_asc', nTable).bind( 'click', function () {
			this.blur();
		} );
	},
	
	/*
	 * Function: _fnCloneTfoot
	 * Purpose:  Clone the tfoot element
	 * Returns:  -
	 * Inputs:   object:oCache - the cached values for this fixed element
	 */
	_fnCloneTfoot: function ( oCache )
	{
		var s = this.fnGetSettings();
		var nTable = oCache.nNode;
		
		/* Set the wrapper width to match that of the cloned table */
		oCache.nWrapper.style.width = $(s.nTable).outerWidth()+"px";
		
		/* Remove any children the cloned table has */
		while ( nTable.childNodes.length > 0 )
		{
			nTable.removeChild( nTable.childNodes[0] );
		}
		
		/* Clone the DataTables footer */
		var nTfoot = $('tfoot', s.nTable).clone(true)[0];
		nTable.appendChild( nTfoot );
		
		/* Copy the widths across - apparently a clone isn't good enough for this */
		$("tfoot:eq(0)>tr th", s.nTable).each( function (i) {
			$("tfoot:eq(0)>tr th:eq("+i+")", nTable).width( $(this).width() );
		} );
		
		$("tfoot:eq(0)>tr td", s.nTable).each( function (i) {
			$("tfoot:eq(0)>tr th:eq("+i+")", nTable)[0].style.width( $(this).width() );
		} );
	},
	
	/*
	 * Function: _fnCloneTLeft
	 * Purpose:  Clone the left column
	 * Returns:  -
	 * Inputs:   object:oCache - the cached values for this fixed element
	 */
	_fnCloneTLeft: function ( oCache )
	{
		var s = this.fnGetSettings();
		var nTable = oCache.nNode;
		var nBody = $('tbody', s.nTable)[0];
		var iCols = $('tbody tr:eq(0) td', s.nTable).length;
		var bRubbishOldIE = ($.browser.msie && ($.browser.version == "6.0" || $.browser.version == "7.0"));
		
		/* Remove any children the cloned table has */
		while ( nTable.childNodes.length > 0 )
		{
			nTable.removeChild( nTable.childNodes[0] );
		}
		
		/* Is this the most efficient way to do this - it looks horrible... */
		nTable.appendChild( $("thead", s.nTable).clone(true)[0] );
		nTable.appendChild( $("tbody", s.nTable).clone(true)[0] );
		if ( s.bFooter )
		{
			nTable.appendChild( $("tfoot", s.nTable).clone(true)[0] );
		}
		
		/* Remove unneeded cells */
		$('thead tr', nTable).each( function (k) {
			$('th:gt(0)', this).remove();
		} );

		$('tfoot tr', nTable).each( function (k) {
			$('th:gt(0)', this).remove();
		} );

		$('tbody tr', nTable).each( function (k) {
			$('td:gt(0)', this).remove();
		} );
		
		this.fnEqualiseHeights( 'tbody', nBody.parentNode, nTable );
		
		var iWidth = $('thead tr th:eq(0)', s.nTable).outerWidth();
		nTable.style.width = iWidth+"px";
		oCache.nWrapper.style.width = iWidth+"px";
	},
	
	/*
	 * Function: _fnCloneTRight
	 * Purpose:  Clone the right most colun
	 * Returns:  -
	 * Inputs:   object:oCache - the cached values for this fixed element
	 */
	_fnCloneTRight: function ( oCache )
	{
		var s = this.fnGetSettings();
		var nBody = $('tbody', s.nTable)[0];
		var nTable = oCache.nNode;
		var iCols = $('tbody tr:eq(0) td', s.nTable).length;
		var bRubbishOldIE = ($.browser.msie && ($.browser.version == "6.0" || $.browser.version == "7.0"));
		
		/* Remove any children the cloned table has */
		while ( nTable.childNodes.length > 0 )
		{
			nTable.removeChild( nTable.childNodes[0] );
		}
		
		/* Is this the most efficient way to do this - it looks horrible... */
		nTable.appendChild( $("thead", s.nTable).clone(true)[0] );
		nTable.appendChild( $("tbody", s.nTable).clone(true)[0] );
		if ( s.bFooter )
		{
			nTable.appendChild( $("tfoot", s.nTable).clone(true)[0] );
		}
		$('thead tr th:not(:nth-child('+iCols+'n))', nTable).remove();
		$('tfoot tr th:not(:nth-child('+iCols+'n))', nTable).remove();
		
		/* Remove unneeded cells */
		$('tbody tr', nTable).each( function (k) {
			$('td:lt('+(iCols-1)+')', this).remove();
		} );
		
		this.fnEqualiseHeights( 'tbody', nBody.parentNode, nTable );
		
		var iWidth = $('thead tr th:eq('+(iCols-1)+')', s.nTable).outerWidth();
		nTable.style.width = iWidth+"px";
		oCache.nWrapper.style.width = iWidth+"px";
	},
	
	
	/**
	 * Equalise the heights of the rows in a given table node in a cross browser way. Note that this
	 * is more or less lifted as is from FixedColumns
	 *  @method  fnEqualiseHeights
	 *  @returns void
	 *  @param   {string} parent Node type - thead, tbody or tfoot
	 *  @param   {element} original Original node to take the heights from
	 *  @param   {element} clone Copy the heights to
	 *  @private
	 */
	"fnEqualiseHeights": function ( parent, original, clone )
	{
		var that = this,
			jqBoxHack = $(parent+' tr:eq(0)', original).children(':eq(0)'),
			iBoxHack = jqBoxHack.outerHeight() - jqBoxHack.height(),
			bRubbishOldIE = ($.browser.msie && ($.browser.version == "6.0" || $.browser.version == "7.0"));
		
		/* Remove cells which are not needed and copy the height from the original table */
		$(parent+' tr', clone).each( function (k) {
			/* Can we use some kind of object detection here?! This is very nasty - damn browsers */
			if ( $.browser.mozilla || $.browser.opera )
			{
				$(this).children().height( $(parent+' tr:eq('+k+')', original).outerHeight() );
			}
			else
			{
				$(this).children().height( $(parent+' tr:eq('+k+')', original).outerHeight() - iBoxHack );
			}
			
			if ( !bRubbishOldIE )
			{
				$(parent+' tr:eq('+k+')', original).height( $(parent+' tr:eq('+k+')', original).outerHeight() );		
			}
		} );
	}
};

	
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Static properties and methods
 *   We use these for speed! This information is common to all instances of FixedHeader, so no
 * point if having them calculated and stored for each different instance.
 */

/*
 * Variable: oWin
 * Purpose:  Store information about the window positioning
 * Scope:    FixedHeader
 */
FixedHeader.oWin = {
	"iScrollTop": 0,
	"iScrollRight": 0,
	"iScrollBottom": 0,
	"iScrollLeft": 0,
	"iHeight": 0,
	"iWidth": 0
};

/*
 * Variable: oDoc
 * Purpose:  Store information about the document size
 * Scope:    FixedHeader
 */
FixedHeader.oDoc = {
	"iHeight": 0,
	"iWidth": 0
};

/*
 * Variable: afnScroll
 * Purpose:  Array of functions that are to be used for the scrolling components
 * Scope:    FixedHeader
 */
FixedHeader.afnScroll = [];

/*
 * Function: fnMeasure
 * Purpose:  Update the measurements for the window and document
 * Returns:  -
 * Inputs:   -
 */
FixedHeader.fnMeasure = function ()
{
	var
		jqWin = $(window),
		jqDoc = $(document),
		oWin = FixedHeader.oWin,
		oDoc = FixedHeader.oDoc;
	
	oDoc.iHeight = jqDoc.height();
	oDoc.iWidth = jqDoc.width();
	
	oWin.iHeight = jqWin.height();
	oWin.iWidth = jqWin.width();
	oWin.iScrollTop = jqWin.scrollTop();
	oWin.iScrollLeft = jqWin.scrollLeft();
	oWin.iScrollRight = oDoc.iWidth - oWin.iScrollLeft - oWin.iWidth;
	oWin.iScrollBottom = oDoc.iHeight - oWin.iScrollTop - oWin.iHeight;
};


FixedHeader.VERSION = "2.1.0.dev";
FixedHeader.prototype.VERSION = FixedHeader.VERSION;

	
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Global processing
 */

/*
 * Just one 'scroll' event handler in FixedHeader, which calls the required components. This is
 * done as an optimisation, to reduce calculation and proagation time
 */
$(window).scroll( function () {
	FixedHeader.fnMeasure();
	for ( var i=0, iLen=FixedHeader.afnScroll.length ; i<iLen ; i++ )
	{
		FixedHeader.afnScroll[i]();
	}
} );


}(window, document, jQuery));


