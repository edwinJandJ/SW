/**
 * 機能名：送り状番号
 */
var jorVlocJson = getJorVLocJson();
function suitelet(request, response) {
	// 画面作成処理
	var form = createForm();
	// 画面ｵｰﾀﾞｰ日付取得
	var orderDate = request.getParameter("orderdate");
	// 送り状番号チェックされた注文書を取得処理
	var results = searchOrder(form, orderDate);
	if(!results || !results.length>0){response.writePage(form);}
	
	// 送り状番号チェックされた注文書のオーダーNo取得
	var orderNos = [];
	var soJson = {};
	for (var i = 0; i < results.length; i++) 
	{
		var tranid = results[i].getValue("tranid");//注文番号
		if(!~orderNos.indexOf(tranid))
		{
			orderNos.push(tranid);
			soJson[tranid+""] = {
					"trandate":results[i].getValue("trandate"),                     //オーダー日付
					"otherrefnum":results[i].getValue("otherrefnum"),               //得意先PO
					"location":results[i].getValue("location"),                     //場所
					"ordertype":results[i].getText("custbody_sw_orderclasfication"),//オーダータイプ
					"companyname":results[i].getValue("companyname","customer"),    //代理店名
					"fax":results[i].getValue("fax","customer"),                    //代理店fax
					"faxnum":results[i].getValue("custbody_sw_otc_faxnum1"),        //FAX番号
					"manager":results[i].getValue("custbody_sw_otc_manager1"),      //担当者
					"name":results[i].getValue("custbody_sw_otc_name1"),            //名称
					"item":results[i].getText("item"),                              //アイテム
					"hosp":results[i].getValue("custrecord_sw_short_hospital_name","custcol_sw_otc_hospcodesub")//病院名
			};
		}
	}
	// WMS配送実績からお問合せ番号と配送業者データ取得
	var somactpJson = {};
	if(orderNos&&orderNos.length>0)
	{
		for(var j = 0;j < orderNos.length;j++) 
		{
			var somactpData = nlapiSearchRecord("customrecord_sw_wms_somactp",null,[["custrecord_ws_sedoco","equalto",orderNos[j]]],
					     [new nlobjSearchColumn("custrecord_ws_sedlno"), new nlobjSearchColumn("custrecord_ws_secrfg")]);
			if(somactpData&&somactpData.length>0)
			{
				somactpJson[orderNos[j]+""] = {
						"sedlno":somactpData[0].getValue("custrecord_ws_sedlno"),//問合せ番号
						"secrfg":somactpData[0].getValue("custrecord_ws_secrfg") //配送業者
				};
			}
		}
	}
	// 画面表示処理
	addDataToForm(form,soJson,somactpJson);
	// 印刷処理
	var isPrint = request.getParameter("isPrint");
	if(isPrint) 
	{
	    invoicePrint(request,response,form,soJson,somactpJson);
	}else
	{
		response.writePage(form);
	}
}
/**
 * 送り状番号チェックされた注文書を取得処理
 */
function searchOrder(form, orderDate) {
	var search = nlapiCreateSearch("salesorder",
			[
			   ["type","anyof","SalesOrd"], 
			   "AND", 
			   ["mainline","is","F"], 
			   "AND", 
			   ["taxline","is","F"], 
			   "AND", 
			   ["custbody_sw_otc_invoicesend","is","T"],//送り状要
			   "AND",
			   ["item.type","noneof","NonInvtPart"]
			], 
			[
			   new nlobjSearchColumn("trandate").setSort(false),                  //オーダー日付
			   new nlobjSearchColumn("tranid").setSort(false),                    //注文番号
			   new nlobjSearchColumn("custcol_sw_otc_orderlinenb").setSort(false),//行NO
			   new nlobjSearchColumn("custbody_sw_orderclasfication"),            //オーダータイプ
			   new nlobjSearchColumn("entity"),                                   //代理店
			   new nlobjSearchColumn("companyname","customer",null),              //代理店の代理店名
			   new nlobjSearchColumn("fax","customer",null),                      //代理店のFAX
			   new nlobjSearchColumn("item"),                                     //アイテム
			   new nlobjSearchColumn("custbody_sw_otc_faxnum1"),                  //FAX番号
			   new nlobjSearchColumn("custbody_sw_otc_name1"),                    //名称
			   new nlobjSearchColumn("custbody_sw_otc_manager1"),                 //担当者
			   new nlobjSearchColumn("location"),                                 //場所
			   new nlobjSearchColumn("otherrefnum"),                              //得意先PO
			   new nlobjSearchColumn("custcol_sw_otc_hospcodesub"),               //病院コード
			   new nlobjSearchColumn("custrecord_sw_short_hospital_name","custcol_sw_otc_hospcodesub",null)//名前（略称）
			]);
			
	// ｵｰﾀﾞｰ日付指定場合
	if (orderDate) {
		form.setFieldValues({"custpage_sw_orderdate" : orderDate});
		search.addFilter(new nlobjSearchFilter("trandate", null, "on", orderDate));	
	} 
	return cmnGetAllResultsOfSearch(search);
}
/**
 * createForm 
 * @param
 * @returns
 */
function createForm() {
	
	var form = nlapiCreateForm("送り状番号");
	form.addButton("custpage_sw_invoiceprint", "送り状番号印刷", "homepagVisit");
	form.addField("custpage_sw_orderdate", "date", "ｵｰﾀﾞｰ日付");
	var sublist = form.addSubList('custpage_list', 'list', "情報");
	sublist.addMarkAllButtons();
	sublist.addField("custpage_checkbox", "checkbox", "OPT");
	sublist.addField("custpage_sw_inputdate", "date", "ｵｰﾀﾞｰ日付");
	sublist.addField("custpage_sw_invoiceno", "text", "伝票番号");
	sublist.addField("custpage_sw_sw_ordertype", "text", "ｵｰﾀﾞｰﾀｲﾌﾟ");
	sublist.addField("custpage_sw_insername", "text", "登録名称");
	sublist.addField("custpage_sw_registerfaxno", "text", "登録FAX番号");
	sublist.addField("custpage_sw_meisho", "text", "名称").setDisplayType("entry");
	sublist.addField("custpage_sw_faxnum", "text", "FAX番号").setDisplayType("entry");
	sublist.addField("custpage_sw_tanntousya", "text", "ご担当者").setDisplayType("entry");
	sublist.addField("custpage_sw_productno", "text", "指定製品コード");
	// お問い合わせ番号と配達業者を画面表示に追加
	sublist.addField("custpage_sw_inquiry", "text", "お問合せ番号");
	sublist.addField("custpage_sw_poster", "text", "配送業者");
	sublist.addField("custpage_sw_location", "text", "location").setDisplayType("hidden");
	sublist.addField("custpage_sw_otherrefnum", "text", "otherrefnum").setDisplayType("hidden");
	sublist.addField("custpage_sw_hosp", "text", "hosp").setDisplayType("hidden");

	form.setScript("customscript_sw_otc_invoicenum");
	return form;
}
/**
 * 表示データ設定
 * 
 * @param
 * @returns
 */
function invoicePrint(request,response, form, soJson,somactpJson){
	var templateresults = nlapiSearchRecord("customrecord_sw_print_config", null,null,[new nlobjSearchColumn("custrecord_pt_okurijyo")]);
	if(templateresults&&templateresults.length>0)
	{
		var templateID = templateresults[0].getValue("custrecord_pt_okurijyo");
	    if(templateID)
	    {
	    	var template = nlapiLoadFile(templateID);     //HTML 的内部ID， 可在file里找到。
			var tpl = template.getValue();  
			var jsonData = getJsonData(request,form,soJson,somactpJson);
			var xml = juicer(tpl, jsonData);   
			var pdf = nlapiXMLToPDF(xml);
			pdf.setEncoding('UTF-8'); // UTF-8,GB2312 etc.
			response.setContentType('PDF', "送り状番号のご案内.pdf","inline");
			response.write(pdf.getValue());
			return true;
	    }else
	    {
	    	response.writePage(form);
	    }
	}else
	{
		response.writePage(form);
	}
}

function addDataToForm(form,soJson,somactpJson){
	var sublist = form.getSubList("custpage_list");
	var linenum = 1;
	if(soJson && Object.keys(soJson).length > 0)
	{
		for(var i in soJson)
		{
			sublist.setLineItemValue("custpage_sw_invoiceno", linenum, nullToEmpty(i));                         //伝票番号
			if(soJson[i])
			{
				sublist.setLineItemValue("custpage_sw_inputdate", linenum, nullToEmpty(soJson[i].trandate));    //ｵｰﾀﾞｰ日付
				sublist.setLineItemValue("custpage_sw_sw_ordertype", linenum, nullToEmpty(soJson[i].ordertype));//ｵｰﾀﾞｰﾀｲﾌﾟ
				sublist.setLineItemValue("custpage_sw_insername", linenum, nullToEmpty(soJson[i].companyname)); //登録名称
				sublist.setLineItemValue("custpage_sw_registerfaxno", linenum, nullToEmpty(soJson[i].fax));     //登録FAX番号
				sublist.setLineItemValue("custpage_sw_faxnum", linenum, nullToEmpty(soJson[i].faxnum));         //FAX番号
				sublist.setLineItemValue("custpage_sw_tanntousya", linenum, nullToEmpty(soJson[i].manager));    //ご担当者
				sublist.setLineItemValue("custpage_sw_meisho", linenum, nullToEmpty(soJson[i].name));           //名称
				sublist.setLineItemValue("custpage_sw_productno", linenum, nullToEmpty(soJson[i].item));        //指定製品コード	
			}
		    if(somactpJson&&somactpJson[i])
		    {
		    	sublist.setLineItemValue("custpage_sw_inquiry", linenum, nullToEmpty(somactpJson[i].sedlno));   //お問合せ番号
				sublist.setLineItemValue("custpage_sw_poster", linenum, nullToEmpty(somactpJson[i].secrfg));    //配送業者
		    }		
			linenum++;
		}	
	}	
}
function getJsonData(request,form,soJson,somactpJson){
	var tranid = request.getParameter("tranid");     //注文番号
	var meisho = request.getParameter("meisho");     //名称
	var fax = request.getParameter("fax");           //FAX
	var tanToSya = request.getParameter("tanToSya"); //担当者
	var branchOffice = ""; //支店
	var tel = "";          //支店電話
	var deliveryCom = "";  //配送業者
	var deliveryNum = "";  //お問い合わせ番号
	if(somactpJson && somactpJson[tranid+""])
	{
		deliveryCom = somactpJson[tranid+""].secrfg;
		deliveryNum = somactpJson[tranid+""].sedlno;
		var location = soJson[tranid+""].location;       //場所
		if(location)
		{
			var locRec = nlapiLoadRecord("location", location);
			var parent = locRec.getFieldValue("parent");
			if(jorVlocJson)
			{
				if(parent == jorVlocJson.jloc)//CLCJ
				{
					if(deliveryCom == "ヤマト")
					{
						branchOffice = "ヤマトグローバルエクスプレス浜松営業所";
						tel = "0534-68-1381";
					}else if(deliveryCom == "佐川")
					{
						branchOffice = "佐川急便　袋井支店";
						tel = "0538-42-3125";
					}else if(deliveryCom == "日通")
					{
						branchOffice = "日本通運便　浜松航空支店";
						tel = "053-431-1130";
					}
				}else if(parent == jorVlocJson.vloc)//FLC
				{
					if(deliveryCom == "佐川")
					{
						branchOffice = "佐川急便　福岡営業所";
						tel = "092-631-52611";
					}else if(deliveryCom == "ヤマト")
					{
						branchOffice = "ヤマトグローバルエクスプレス福岡ソリューション（営）";
						tel = "092-451-7794";
					}
				}
			}
		}
	}
	var json = {
			"transactiondate" : soJson[tranid+""].trandate,
			"customerCompany" : meisho || soJson[tranid+""].companyname,	
			"SONum" : tranid,
			"PONum" : soJson[tranid+""].otherrefnum,
			"fax" : fax || soJson[tranid+""].fax,	
			"designatedprocode" : soJson[tranid+""].item,
			"tanToSya" : tanToSya,	// 担当者
			"deliveryCom" : deliveryCom || "",//配達業者
			"deliveryNum" : deliveryNum || "",//お問い合わせ番号
			"branchOffice" : branchOffice,
			"TELL" : tel,
			"comment" : soJson[tranid+""].hosp,
		      	"ordertp" : soJson[tranid+""].ordertype
	};
	return json;
}
/**
* 倉庫取得
* @returns
*/
function getJorVLocJson()
{
	var results = nlapiSearchRecord("customrecord_sw_wms_config", null, null,
			[ new nlobjSearchColumn("custrecord_wc_location_j"),
			  new nlobjSearchColumn("custrecord_wc_location_v")]);
	if(results&&results.length>0)
	{
		return {"jloc":results[0].getValue("custrecord_wc_location_j"),
			"vloc":results[0].getValue("custrecord_wc_location_v")};
	}
	return;
}
/**
* 保存検索すべて結果取得
* @param search
* @returns
*/
function cmnGetAllResultsOfSearch(search){
	var resultSet = search.runSearch();
	var start = 0; 
	var step  = 1000;
	var resultArr= [];
	var results = resultSet.getResults(start, Number(start)+Number(step));
	while(results && results.length>0){ 
		resultArr = resultArr.concat(results);
		start = Number(start)+Number(step); 
		results = resultSet.getResults(start, Number(start)+Number(step));
	}
	return resultArr;
}
/**
 * Convert null to empty !
 * @param parameter
 * @returns {String}
 */
function nullToEmpty(parameter,includeZero){
	return includeZero?(parameter || ""):(parameter + "" == "0"?0:(parameter || ""));
}