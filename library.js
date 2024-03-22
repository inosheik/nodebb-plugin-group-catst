'use strict';

const nconf = require.main.require('nconf');
const winston = require.main.require('winston');

const meta = require.main.require('./src/meta');

const controllers = require('./lib/controllers');

const routeHelpers = require.main.require('./src/routes/helpers');

const async = require.main.require('async');
const db = require.main.require('./src/database');
const groups = require.main.require('./src/groups');
const categories = require.main.require('./src/categories');
const privileges = require.main.require('./src/privileges');
const categoriesAPI = require.main.require('./src/api/categories');

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

plugin.createGroupFilter = async function(data){
	if ( !data.group.system ) {
		console.log("JSON.stringify(data)")
		console.log(JSON.stringify(data))
		const result = await categories.create(data.group);
		const cidnum = result.cid;
		const callerobj = data.caller;
		const membernum = data.caller.uid;
		console.log("JSON.stringify(result)")
		console.log(JSON.stringify(result))

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
		const modPrivileges = defaultPrivilegesToRescind.concat([
			'groups:topics:schedule',
			'groups:posts:view_deleted',
			'groups:purge',
		]);

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

		data.member = membernum;
		callerobj.uid = 1;
		callerobj.req.uid = 1;
		const modPrivilegeList = ["find","read","topics:read","topics:create","topics:reply","topics:schedule","topics:tag",
								"posts:edit","posts:history","posts:delete","posts:upvote","posts:downvote","topics:delete","posts:view_deleted","purge","moderate"];

		await categoriesAPI.setPrivilege(callerobj, { cid:cidnum, privilege: modPrivilegeList, member:membernum, set:true });
		data.group.memberPostCids = JSON.stringify(cidnum);
		data.group.memberPostCidsArray = [JSON.stringify(cidnum)];
	}

	return data;
}

plugin.groupCreated = async function(data){
	if ( !data.group.system ) {
		const memberPrivilegeListGroup = ["groups:find","groups:read","groups:topics:read","groups:topics:create","groups:topics:reply",
								"groups:topics:tag","groups:posts:edit","groups:posts:delete","groups:posts:upvote","groups:posts:downvote"]
		const callerobj = data.caller;
		callerobj.uid = 1;
		callerobj.req.uid = 1;
		const dataGroupName = data.group.name;
		const cidnum = data.group.memberPostCids;
		await categoriesAPI.setPrivilege(callerobj, { cid:cidnum, privilege: memberPrivilegeListGroup, member:dataGroupName, set:true });
		//await privileges.categories.give(privilegeList, cidnum, data.group.name);
	}
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
