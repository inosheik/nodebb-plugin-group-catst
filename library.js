"use strict";
//
const plugin = module.exports;

const async = require('async');
const db = require.main.require('./src/database');
const groups = require.main.require('./src/groups');
const categories = require.main.require('./src/categories');
const privileges = require.main.require('./src/privileges');
const categoriesAPI = require.main.require('./src/api/categories');


plugin.init = function(params, callback) {

};


plugin.destroyGroup = async function(data){
	//if ( !data.group.system ) {
	console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("console.log(JSON.stringify(data))1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log(JSON.stringify(data))
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("ww1111222223333335675234789652387647836548685827645827827823468723856783")
	//if (data.group.hasOwnProperty('memberPostCids')) {
		const validCids = await categories.getCidsByPrivilege('categories:cid', data.groups[0].name, 'topics:read');
		const cidsArray = data.groups[0].memberPostCids.split(',').map(cid => parseInt(cid.trim(), 10)).filter(Boolean);
		const toRemovePostCidsArr = cidsArray.filter(cid => validCids.includes(cid));
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("console.log(JSON.stringify(toRemovePostCidsArr))1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log(JSON.stringify(toRemovePostCidsArr))
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("ww1111222223333335675234789652387647836548685827645827827823468723856783")
	//}

		const catUpd = {};
		catUpd[toRemovePostCidsArr[0]] = {disabled:1};
		await categories.update(catUpd,function(err){});
};

plugin.createGroup = async function(data){
	if ( !data.group.system ) {
	console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
	console.log("1console.log(JSON.stringify(data))111222223333335675234789652387647836548685827645827827823468723856783")
	console.log(JSON.stringify(data))
	console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
	console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
	console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
	console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
	console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
	console.log("createGroup")
	console.log("uuuuu1111222223333335675234789652387647836548685827645827827823468723856783")
	console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
	console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
	console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
	//data.group.cloneFromCid = 3;
	//data.group.memberPostCids = 2;

		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("console.log(JSON.stringify(result))1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("vvv1111222223333335675234789652387647836548685827645827827823468723856783")
		const result = await categories.create(data.group);
		console.log(JSON.stringify(result))
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("ww1111222223333335675234789652387647836548685827645827827823468723856783")
		const defaultPrivileges = [
			'groups:find',
			'groups:read',
			'groups:topics:read',
			'groups:topics:create',
			'groups:topics:reply',
			'groups:topics:tag',
			'groups:posts:edit',
			'groups:posts:history',
			'groups:posts:delete',
			'groups:posts:upvote',
			'groups:posts:downvote',
			'groups:topics:delete',
		];
		const modPrivileges = defaultPrivileges.concat([
			'groups:topics:schedule',
			'groups:posts:view_deleted',
			'groups:purge',
		]);
		const guestPrivileges = ['groups:find', 'groups:read', 'groups:topics:read'];
		result.defaultPrivileges = defaultPrivileges;
		result.modPrivileges = modPrivileges;
		result.guestPrivileges = guestPrivileges;
		console.log("xx1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		await privileges.categories.rescind(result.defaultPrivileges, result.cid, 'registered-users');
		console.log("yy1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("1111222223333335675234789652387647836548685827645827827823468723856783")
		await privileges.categories.give(result.guestPrivileges, result.cid, ['guests', 'spiders','registered-users']);
		console.log("zz1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("zz1111222223333335675234789652387647836548685827645827827823468723856783")

		console.log("zz1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("zz1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("console.log(JSON.stringify(result));52387647836548685827645827827823468723856783")
		console.log(JSON.stringify(result));
		console.log("zz1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("zz1111222223333335675234789652387647836548685827645827827823468723856783")
		console.log("console.log(JSON.stringify(data.caller));2387647836548685827645827827823468723856783")
		console.log(JSON.stringify(data.caller));
		console.log("console.log(JSON.stringify(data.caller.uid));2387647836548685827645827827823468723856783")
		console.log(JSON.stringify(data.caller.uid));
		const cidnum = result.cid;
		const callerobj = data.caller;
		const membernum = data.caller.uid;
		data.member = membernum;
		callerobj.uid = 1;
		callerobj.req.uid = 1;
		const privilegeList = await privileges.categories.getUserPrivilegeList();
		const privilegeListGroup = await privileges.categories.getGroupPrivilegeList();
		console.log("console.log(JSON.stringify(privilegeList));52387647836548685827645827827823468723856783")
		console.log(JSON.stringify(privilegeList));
		await categoriesAPI.setPrivilege(callerobj, { cid:cidnum, privilege: privilegeList, member:membernum, set:true });
		console.log("VVVVyayayay1111222223333335675234789652387647836548685827645827827823468723856783");
		console.log("WWWyayayay1111222223333335675234789652387647836548685827645827827823468723856783");
		console.log("XXXXyayayay1111222223333335675234789652387647836548685827645827827823468723856783");
		console.log(JSON.stringify(data.group));
		console.log(JSON.stringify(data.group.name));
		const dataGroupName = data.group.name;
		await categoriesAPI.setPrivilege(callerobj, { cid:cidnum, privilege: privilegeListGroup, member:dataGroupName, set:true });
		//await privileges.categories.give(privilegeList, cidnum, data.group.name);
		data.group.memberPostCids = JSON.stringify(cidnum);
		data.group.memberPostCidsArray = [JSON.stringify(cidnum)];
		const dataGroup = data.group;
		await groups.update(dataGroupName, dataGroup);
		console.log("YYYYyayayay1111222223333335675234789652387647836548685827645827827823468723856783");
		console.log("ZZZZyayayay1111222223333335675234789652387647836548685827645827827823468723856783");
	}
	//return data;
}
