'use strict';

const nconf = require.main.require('nconf');
const winston = require.main.require('winston');
const _ = require.main.require('lodash');

const meta = require.main.require('./src/meta');

const controllers = require('./lib/controllers');

const routeHelpers = require.main.require('./src/routes/helpers');

const async = require.main.require('async');
const db = require.main.require('./src/database');
const groups = require.main.require('./src/groups');
const categories = require.main.require('./src/categories');
const privileges = require.main.require('./src/privileges');
const categoriesAPI = require.main.require('./src/api/categories');

const user = require.main.require('./src/user');

const guestPrivileges = ['groups:find', 'groups:read', 'groups:topics:read'];
const guestLockedPrivileges = ['groups:find'];
const defaultPrivilegesToRescind = [
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
	'groups:topics:schedule',
	'groups:posts:view_deleted',
	'groups:purge',
	'groups:topics:delete',
	'groups:posts:view_deleted',
	'groups:purge',
	'groups:moderate',
];
const defaultPrivilegesGiveForOpen = [
	'groups:find',
	'groups:read',
	'groups:topics:read',
	'groups:topics:create',
	'groups:topics:reply',
	'groups:topics:tag',
	'groups:posts:upvote',
	'groups:posts:downvote'
];
const modPrivilegeList = ["find","read","topics:read","topics:create","topics:reply","topics:schedule","topics:tag",
"posts:edit","posts:history","posts:delete","posts:upvote","posts:downvote","topics:delete",
"posts:view_deleted","purge","moderate"];

const plugin = {};

plugin.init = async (params) => {
	const { router /* , middleware , controllers */ } = params;

	// Settings saved in the plugin settings can be retrieved via settings methods
	const { setting1, setting2 } = await meta.settings.get('quickstart');
	if (setting1) {
		console.log(setting2);
	}

	/**
	 * We create two routes for every view. One API call, and the actual route itself.
	 * Use the `setupPageRoute` helper and NodeBB will take care of everything for you.
	 *
	 * Other helpers include `setupAdminPageRoute` and `setupAPIRoute`
	 * */
	routeHelpers.setupPageRoute(router, '/quickstart', [(req, res, next) => {
		winston.info(`[plugins/quickstart] In middleware. This argument can be either a single middleware or an array of middlewares`);
		setImmediate(next);
	}], (req, res) => {
		winston.info(`[plugins/quickstart] Navigated to ${nconf.get('relative_path')}/quickstart`);
		res.render('quickstart', { uid: req.uid });
	});

	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/quickstart', controllers.renderAdminPage);
};

plugin.getGroupFilter = async function(data){
	// console.log(JSON.stringify("data 1")) 
	// console.log(JSON.stringify(data))
	if ( data.group.system !== 1 || data.group.name === 'Global Moderators' || data.group.name === 'administrators' ){
		data.group.locked = parseInt(data.group.locked, 10) == 1 ? 1 : 0;
		data.group.public = parseInt(data.group.public, 10) == 1 ? 1 : 0;
		data.group.open = parseInt(data.group.open, 10) == 1 ? 1 : 0;

		let modUids = [];
		let modMembersArray = [];
		let nonModMembers = [];
		let allMembersSorted = [];
		data.memberPostCidsArray = data.group.memberPostCidsArray.map( v => parseInt(v, 10) );

		if ( data.group.hasOwnProperty('groupModerators') && data.group.groupModerators ){
			modUids = data.group.groupModerators.split(',').map(modUid => parseInt(modUid, 10)).filter(Boolean);
			modMembersArray = data.group.members.filter(member => modUids.includes(member.uid));
			modMembersArray.forEach((member) => {
					member.isModerator = true;
				});
			nonModMembers = data.group.members.filter(member => !modUids.includes(member.uid));
			allMembersSorted = modMembersArray.concat(nonModMembers);
		} 
		data.group.members = [...allMembersSorted]
	}
return data;
}

plugin.groupCreateFilter = async function(data){
	if ( data.group.system !== 1 ) {
		// console.log("JSON.stringify(createGroupFilter data)")
		// console.log(JSON.stringify(data))

		const adminCallerobj = _.clone(data.caller);
		const membernum = data.caller.uid;
		data.member = membernum;
		adminCallerobj.uid = 1;
		adminCallerobj.req.uid = 1;

		//create members cat and mods sub-category
		let dataSubcat = _.clone(data.group);
		let cidnum = 0;
		let cidnumSubcat = 0;
		let result;

		//create a new members category for this group
		await categories.create(data.group)
		.then(async res =>  result = res)
		.then(async res => {
					cidnum = res.cid 
					return cidnum
				})
		.then(async cidnum => {
			dataSubcat.name = 'Moderators Area - '+cidnum.toString(),
			dataSubcat.description = 'This is the area restricted for Moderators of this group. Moderators can use this area to discuss issues about managing their group. Useful information and notifications for Moderators will also be published here.',
			dataSubcat.parentCid = cidnum,
			cidnumSubcat = await categories.create(dataSubcat)
			return cidnumSubcat
			})
		.then(async cidnumSubcat => {
			data.group.moderatorCid = cidnumSubcat.cid,
			await privileges.categories.rescind(defaultPrivilegesToRescind, cidnumSubcat.cid, ['guests', 'spiders','registered-users'])
			await categoriesAPI.setPrivilege(adminCallerobj, { cid:cidnumSubcat.cid, privilege: modPrivilegeList, member:membernum, set:true });
		})
	
		//console.log("JSON.stringify(result)")
		//console.log(JSON.stringify(result))

		if (data.data.hasOwnProperty('hidden') & data.data.hidden === 1) {
			await privileges.categories.rescind(defaultPrivilegesToRescind, cidnum, ['guests', 'spiders','registered-users']);
		} else if (data.data.hasOwnProperty('locked') & data.data.locked === 1) {
			await privileges.categories.rescind(defaultPrivilegesToRescind, cidnum, ['guests', 'spiders','registered-users']);
			await privileges.categories.give(guestLockedPrivileges, cidnum, ['guests', 'spiders','registered-users']);
		} else if (data.data.hasOwnProperty('private') & data.data.private === 1) {
			await privileges.categories.rescind(defaultPrivilegesToRescind, cidnum, 'registered-users');
			await privileges.categories.give(guestPrivileges, cidnum, 'registered-users');
		} else if (data.data.hasOwnProperty('public') & data.data.public === 1) {
			await privileges.categories.rescind(defaultPrivilegesToRescind, cidnum, 'registered-users');
			await privileges.categories.give(guestPrivileges, cidnum, 'registered-users');
		} else if (data.data.hasOwnProperty('open') & data.data.open === 1) {
			await privileges.categories.rescind(defaultPrivilegesToRescind, cidnum, 'registered-users');
			await privileges.categories.give(defaultPrivilegesGiveForOpen, cidnum, 'registered-users');
		}
		await categoriesAPI.setPrivilege(adminCallerobj, { cid:cidnum, privilege: modPrivilegeList, member:membernum, set:true });
		data.group.memberPostCids = cidnum;
		data.group.memberPostCidsArray = [cidnum];
	}
	
	return data;
}

plugin.groupCreated = async function(data){
	if ( data.group.system !== 1 ) {
		// console.log("JSON.stringify(groupCreated data)")
		// console.log(JSON.stringify(data))


		const memberPrivilegeListGroup = ["groups:find","groups:read","groups:topics:read","groups:topics:create","groups:topics:reply","groups:topics:tag","groups:posts:edit","groups:posts:delete","groups:posts:upvote","groups:posts:downvote"]
		const adminCallerobj = _.clone(data.caller);
		adminCallerobj.uid = 1;
		adminCallerobj.req.uid = 1;
		const dataGroupName = data.group.name;
		const cidnum = parseInt(data.group.memberPostCidsArray[0], 10);

		//check if new group data has custom field 'public' set in the form data
		const isPublicGroup = data.caller.req.body.hasOwnProperty('public') ? parseInt(data.caller.req.body.public, 10) : 0

		//check if new group data has custom field 'locked' set in the form data
		const isLockedGroup = data.caller.req.body.hasOwnProperty('locked') ? parseInt(data.caller.req.body.locked, 10) : 0

		//check if new group data has custom field 'open' set in the form data
		const isOpenGroup = data.caller.req.body.hasOwnProperty('open') ? parseInt(data.caller.req.body.open, 10) : 0

		//set the custom field data into group db, for 'public' field
		await groups.setGroupField(dataGroupName, 'public', isPublicGroup);

		//set the custom field data into group db, for 'locked' field
		await groups.setGroupField(dataGroupName, 'locked', isLockedGroup);

		//set the custom field data into group db, for 'open' field
		await groups.setGroupField(dataGroupName, 'open', isOpenGroup);

		await groups.setGroupField(dataGroupName, 'groupModerators', data.caller.uid.toString());

		//set group member privileges in the linked category
		await categoriesAPI.setPrivilege(adminCallerobj, { cid:cidnum, privilege: memberPrivilegeListGroup, member:dataGroupName, set:true });
		//await privileges.categories.give(privilegeList, cidnum, data.group.name);//did not work, alternative above
	}
}

plugin.groupUpdated = async function(data){
		// const incomingData = data;
		// console.log("JSON.stringify(groupUpdated incomingData)")
		// console.log(JSON.stringify(incomingData))
		// console.log(incomingData)

	if (parseInt(data.values.selectGroupType, 10) === 1) {
		data.values.private = 0;
		data.values.public = 1;
		data.values.locked = 0;
		data.values.hidden = 0;
		data.values.open = 0;
		data.values.disableJoinRequests = data.values.hasOwnProperty('disableJoinRequests') && data.values.disableJoinRequests ? 1 : 0
	} else if (parseInt(data.values.selectGroupType, 10) === 5) {
		data.values.private = 0;
		data.values.hidden = 0;
		data.values.public = 0;
		data.values.locked = 0;
		data.values.open = 1;
		data.values.disableJoinRequests = 1;		
	} else if (parseInt(data.values.selectGroupType, 10) === 3) {
		data.values.private = 1;
		data.values.public = 0;
		data.values.locked = 1;
		data.values.hidden = 0;
		data.values.open = 0;
		data.values.disableJoinRequests = 1;
	} else if (parseInt(data.values.selectGroupType, 10) === 4) {
		data.values.private = 1;
		data.values.hidden = 1;
		data.values.public = 0;
		data.values.locked = 0;
		data.values.open = 0;
		data.values.disableJoinRequests = 1;
	} else if (parseInt(data.values.selectGroupType, 10) === 2) {
		data.values.private = 1;
		data.values.public = 0;
		data.values.locked = 0;
		data.values.hidden = 0;
		data.values.open = 0;
		data.values.disableJoinRequests = data.values.hasOwnProperty('disableJoinRequests') & data.values.disableJoinRequests ? 1 : 0	
	}

	await groups.setGroupField(data.values.name, 'public', data.values.public);
	await groups.setGroupField(data.values.name, 'private', data.values.private);
	await groups.setGroupField(data.values.name, 'locked', data.values.locked);
	await groups.setGroupField(data.values.name, 'hidden', data.values.hidden);
	await groups.setGroupField(data.values.name, 'open', data.values.open);
	await groups.setGroupField(data.values.name, 'disableJoinRequests', data.values.disableJoinRequests);

	const groupData = await groups.getGroupData(data.values.name);
	const catUpd = {};
	catUpd[groupData.memberPostCidsArray[0]] = groupData;
	await categories.update(catUpd,function(err){});
	const cidnum = JSON.stringify(groupData.memberPostCidsArray[0]);
	if (data.values.hidden === 1) {
		await privileges.categories.rescind(defaultPrivilegesToRescind, cidnum, ['guests', 'spiders','registered-users']);
	} else if (data.values.locked === 1) {
		await privileges.categories.rescind(defaultPrivilegesToRescind, cidnum, ['guests', 'spiders','registered-users']);
		await privileges.categories.give(guestLockedPrivileges, cidnum, ['guests', 'spiders','registered-users']);
	} else if (data.values.private === 1) {
		await privileges.categories.rescind(defaultPrivilegesToRescind, cidnum, 'registered-users');
		await privileges.categories.give(guestPrivileges, cidnum, 'registered-users');
	} else if (data.values.public === 1) {
		await privileges.categories.rescind(defaultPrivilegesToRescind, cidnum, 'registered-users', data.values.name);
		await privileges.categories.give(guestPrivileges, cidnum, 'registered-users');
	} else if (data.values.open === 1) {
		await privileges.categories.rescind(defaultPrivilegesToRescind, cidnum, 'registered-users', data.values.name);
		await privileges.categories.give(defaultPrivilegesGiveForOpen, cidnum, 'registered-users');
	}
};



plugin.groupsDeleted = async function(data){
	if (data.groups[0].system !== 1 || data.groups[0].name === 'Global Moderators' || data.groups[0].name === 'administrators') {
		let toRemovePostCidsArr = [];
		if (data.groups[0].hasOwnProperty('memberPostCids') && data.groups[0].memberPostCids){
			toRemovePostCidsArr = data.groups[0].memberPostCids.split(',').map(cid => parseInt(cid, 10)).filter(Boolean);
		}

		if (data.groups[0].hasOwnProperty('moderatorCid') && data.groups[0].moderatorCid){
			toRemovePostCidsArr.push(parseInt(data.groups[0].moderatorCid, 10));
		}
		
		let catUpd = {};
		toRemovePostCidsArr.map(cid => catUpd[cid] = {disabled:1})
		await categories.update(catUpd,function(err){});
	}
};

plugin.groupAddedOwner= async function(data){
	const groupName = data.groupName;

	const adminCallerobj = _.clone(data.caller);
	adminCallerobj.uid = 1;
	adminCallerobj.req.uid = 1;

	const groupData = await groups.getGroupData(groupName)
	.then(async groupData => {
		if ( groupData.system !== 1 || groupData.name === 'Global Moderators' || groupData.name === 'administrators'){
			const moderatorSubcat = parseInt(groupData.moderatorCid, 10);
			const groupCategoryArray = groupData.memberPostCids.split(',');
			let groupModeratorsArray = groupData.groupModerators.split(',');

			//add new owner as a moderator to members category and mod category
			await categoriesAPI.setPrivilege(adminCallerobj, { cid: groupCategoryArray[0], privilege: modPrivilegeList, member:data.uid, set:true });
			await categoriesAPI.setPrivilege(adminCallerobj, { cid: moderatorSubcat, privilege: modPrivilegeList, member:data.uid, set:true });

			//add new owner in list of mods in group data
			groupModeratorsArray.indexOf(data.uid) === -1 ?  groupModeratorsArray.push(data.uid.toString()) : null;
			await groups.setGroupField(groupName, 'groupModerators', groupModeratorsArray.toString());
			}
	});
};

plugin.groupLeaveAction = async function (data) {
	//console.log(JSON.stringify(data))
	const adminCallerobj = _.clone(data.caller);
	adminCallerobj.uid = 1;
	adminCallerobj.req.uid = 1;

	for (const group of data.groupNames) {
		const groupData = await groups.getGroupData(group)
		.then (async groupData => {
			if ( groupData.system !== 1 || groupData.name === 'Global Moderators' || groupData.name === 'administrators') {
			const moderatorSubcat = groupData.moderatorCid;
			const groupCategoryArray = groupData.memberPostCids.split(',');
			const groupModeratorsArray = groupData.groupModerators.split(',').map(modId => parseInt(modId, 10));
			const newGroupModeratorsArray = groupModeratorsArray.filter(modId => parseInt(modId, 10) !== parseInt(data.uid, 10));
			await groups.setGroupField(group, 'groupModerators', newGroupModeratorsArray.toString());
			await categoriesAPI.setPrivilege(adminCallerobj, { cid: groupData.memberPostCidsArray[0], privilege: modPrivilegeList, member:data.uid, set:false });
			await categoriesAPI.setPrivilege(adminCallerobj, { cid: moderatorSubcat, privilege: modPrivilegeList, member:data.uid, set:false });
			}
		})
	  }
}

plugin.groupFilterAddModerator = async function(data){
	const groupData = await groups.getGroupData(data.groupName);
	const groupModeratorsArray = groupData.groupModerators.split(',').map(modId => parseInt(modId, 10));
	//add new mod in list of mods in group data
	groupModeratorsArray.indexOf(data.uid) === -1 ?  groupModeratorsArray.push(data.uid.toString()) : null;

	const adminCallerobj = _.clone(data.caller);
	adminCallerobj.uid = 1;
	adminCallerobj.req.uid = 1;

	const moderatorSubcat = parseInt(groupData.moderatorCid, 10);
	await categoriesAPI.setPrivilege(adminCallerobj,
		{ cid: groupData.memberPostCidsArray[0], privilege: modPrivilegeList, member: data.uid, set: true });
	
	await categoriesAPI.setPrivilege(adminCallerobj,
		{ cid: moderatorSubcat, privilege: modPrivilegeList, member: data.uid, set: true });
	
	await groups.setGroupField(data.groupName, 'groupModerators', groupModeratorsArray.toString());

	return data;
}

plugin.groupFilterRemoveModerator = async function(data){
	const groupData = await groups.getGroupData(data.groupName);
	const groupModeratorsArray = groupData.groupModerators.split(',').map(modId => parseInt(modId, 10));
	const newGroupModeratorsArray = groupModeratorsArray.filter(modId => parseInt(modId, 10) !== parseInt(data.uid, 10));
	const adminCallerobj = _.clone(data.caller);
	adminCallerobj.uid = 1;
	adminCallerobj.req.uid = 1;

	const moderatorSubcat = parseInt(groupData.moderatorCid, 10);


	await categoriesAPI.setPrivilege(adminCallerobj,
		{ cid: groupData.memberPostCidsArray[0], privilege: modPrivilegeList, member: data.uid, set: false });

	await categoriesAPI.setPrivilege(adminCallerobj,
		{ cid: moderatorSubcat, privilege: modPrivilegeList, member: data.uid, set: false });
	
	await groups.setGroupField(data.groupName, 'groupModerators', newGroupModeratorsArray.toString());
	
	return data;
}


plugin.addGroupForumRoute = async function({ router, middleware, helpers }){

}



/**
 * If you wish to add routes to NodeBB's RESTful API, listen to the `static:api.routes` hook.
 * Define your routes similarly to above, and allow core to handle the response via the
 * built-in helpers.formatApiResponse() method.
 *
 * In this example route, the `ensureLoggedIn` middleware is added, which means a valid login
 * session or bearer token (which you can create via ACP > Settings > API Access) needs to be
 * passed in.
 *
 * To call this example route:
 *   curl -X GET \
 * 		http://example.org/api/v3/plugins/quickstart/test \
 * 		-H "Authorization: Bearer some_valid_bearer_token"
 *
 * Will yield the following response JSON:
 * 	{
 *		"status": {
 *			"code": "ok",
 *			"message": "OK"
 *		},
 *		"response": {
 *			"foobar": "test"
 *		}
 *	}
 */
plugin.addRoutes = async ({ router, middleware, helpers }) => {
	const middlewares = [
		middleware.ensureLoggedIn,			// use this if you want only registered users to call this route
		// middleware.admin.checkPrivileges,	// use this to restrict the route to administrators
	];

	routeHelpers.setupApiRoute(router, 'get', '/quickstart/:param1', middlewares, (req, res) => {
		helpers.formatApiResponse(200, res, {
			foobar: req.params.param1,
		});
	});
};

plugin.addAdminNavigation = (header) => {
	header.plugins.push({
		route: '/plugins/quickstart',
		icon: 'fa-tint',
		name: 'Quickstart',
	});

	return header;
};

module.exports = plugin;
