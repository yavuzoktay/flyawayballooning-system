-- Update expires to created_at + 24 months for all bookings listed in 123.json
-- Uses DB created_at values (safer) and a single UPDATE

SET SQL_SAFE_UPDATES = 0;

UPDATE trip_booking.all_booking
SET expires = DATE_ADD(created_at, INTERVAL 24 MONTH)
WHERE created_at IS NOT NULL
  AND id IN (
    1149,1218,1244,1245,1247,1248,1249,1250,1251,1252,1253,1254,1255,1256,1257,1258,
    1259,1260,1261,1262,1263,1264,1265,1266,1267,1268,1269,1270,1271,1272,1273,1274,
    1275,1276,1277,1278,1279,1280,1281,1282,1283,1284,1285,1286,1287,1288,1289,1290,
    1291,1292,1293,1294,1295,1296,1297,1298,1299,1300,1301,1302,1303,1304,1305,1306,
    1307,1308,1309,1310,1311,1312,1313,1314,1315,1316,1317,1318,1319,1320,1321,1322,
    1323,1324,1325,1326,1327,1328,1329,1330,1331,1332,1333,1334,1335,1336,1337,1338,
    1339,1340,1341,1342,1343,1344,1345,1346,1347,1348,1349,1350,1351,1352,1353,1354,
    1355,1356,1357,1358,1359,1360,1361,1362
  );

SET SQL_SAFE_UPDATES = 1;
SET SQL_SAFE_UPDATES = 0;

-- Update expires to created_at + 24 months for all bookings in 123.json

UPDATE trip_booking.all_booking SET expires = '2028-01-04 22:48:41' WHERE id = 1149;
UPDATE trip_booking.all_booking SET expires = '2028-01-07 15:36:47' WHERE id = 1218;
UPDATE trip_booking.all_booking SET expires = '2028-01-12 05:26:03' WHERE id = 1244;
UPDATE trip_booking.all_booking SET expires = '2028-01-12 10:27:01' WHERE id = 1245;
UPDATE trip_booking.all_booking SET expires = '2026-01-23 10:19:43' WHERE id = 1247;
UPDATE trip_booking.all_booking SET expires = '2026-04-08 14:56:20' WHERE id = 1248;
UPDATE trip_booking.all_booking SET expires = '2026-04-10 07:53:40' WHERE id = 1249;
UPDATE trip_booking.all_booking SET expires = '2026-04-14 09:18:07' WHERE id = 1250;
UPDATE trip_booking.all_booking SET expires = '2026-05-07 17:47:10' WHERE id = 1251;
UPDATE trip_booking.all_booking SET expires = '2026-05-13 10:41:05' WHERE id = 1252;
UPDATE trip_booking.all_booking SET expires = '2026-05-27 08:37:56' WHERE id = 1253;
UPDATE trip_booking.all_booking SET expires = '2026-05-29 23:59:25' WHERE id = 1254;
UPDATE trip_booking.all_booking SET expires = '2026-05-31 11:22:22' WHERE id = 1255;
UPDATE trip_booking.all_booking SET expires = '2026-06-15 04:41:05' WHERE id = 1256;
UPDATE trip_booking.all_booking SET expires = '2026-06-20 19:27:42' WHERE id = 1257;
UPDATE trip_booking.all_booking SET expires = '2026-06-24 19:22:00' WHERE id = 1258;
UPDATE trip_booking.all_booking SET expires = '2026-07-03 16:42:59' WHERE id = 1259;
UPDATE trip_booking.all_booking SET expires = '2026-07-19 20:43:39' WHERE id = 1260;
UPDATE trip_booking.all_booking SET expires = '2026-07-31 06:44:06' WHERE id = 1261;
UPDATE trip_booking.all_booking SET expires = '2026-08-09 15:52:27' WHERE id = 1262;
UPDATE trip_booking.all_booking SET expires = '2026-08-10 18:28:36' WHERE id = 1263;
UPDATE trip_booking.all_booking SET expires = '2026-08-23 09:16:09' WHERE id = 1264;
UPDATE trip_booking.all_booking SET expires = '2026-08-24 09:17:47' WHERE id = 1265;
UPDATE trip_booking.all_booking SET expires = '2026-08-28 07:51:34' WHERE id = 1266;
UPDATE trip_booking.all_booking SET expires = '2026-09-17 18:21:53' WHERE id = 1267;
UPDATE trip_booking.all_booking SET expires = '2026-09-18 08:49:13' WHERE id = 1268;
UPDATE trip_booking.all_booking SET expires = '2026-09-21 15:35:53' WHERE id = 1269;
UPDATE trip_booking.all_booking SET expires = '2026-10-02 18:29:54' WHERE id = 1270;
UPDATE trip_booking.all_booking SET expires = '2026-11-15 15:27:58' WHERE id = 1271;
UPDATE trip_booking.all_booking SET expires = '2026-12-08 15:41:22' WHERE id = 1272;
UPDATE trip_booking.all_booking SET expires = '2027-01-30 12:08:13' WHERE id = 1273;
UPDATE trip_booking.all_booking SET expires = '2027-02-04 12:40:10' WHERE id = 1274;
UPDATE trip_booking.all_booking SET expires = '2027-02-04 22:37:36' WHERE id = 1275;
UPDATE trip_booking.all_booking SET expires = '2027-02-05 16:45:48' WHERE id = 1276;
UPDATE trip_booking.all_booking SET expires = '2027-02-27 12:14:30' WHERE id = 1277;
UPDATE trip_booking.all_booking SET expires = '2027-02-28 13:05:34' WHERE id = 1278;
UPDATE trip_booking.all_booking SET expires = '2027-03-02 14:56:47' WHERE id = 1279;
UPDATE trip_booking.all_booking SET expires = '2027-03-12 22:23:10' WHERE id = 1280;
UPDATE trip_booking.all_booking SET expires = '2027-03-17 21:48:02' WHERE id = 1281;
UPDATE trip_booking.all_booking SET expires = '2027-03-26 12:44:50' WHERE id = 1282;
UPDATE trip_booking.all_booking SET expires = '2027-04-04 12:07:47' WHERE id = 1283;
UPDATE trip_booking.all_booking SET expires = '2027-04-05 04:15:31' WHERE id = 1284;
UPDATE trip_booking.all_booking SET expires = '2027-04-05 07:24:01' WHERE id = 1285;
UPDATE trip_booking.all_booking SET expires = '2027-04-06 15:40:49' WHERE id = 1286;
UPDATE trip_booking.all_booking SET expires = '2027-04-14 14:25:27' WHERE id = 1287;
UPDATE trip_booking.all_booking SET expires = '2027-05-01 10:00:40' WHERE id = 1288;
UPDATE trip_booking.all_booking SET expires = '2027-05-04 12:04:35' WHERE id = 1289;
UPDATE trip_booking.all_booking SET expires = '2027-05-11 17:20:49' WHERE id = 1290;
UPDATE trip_booking.all_booking SET expires = '2027-05-15 12:04:53' WHERE id = 1291;
UPDATE trip_booking.all_booking SET expires = '2027-05-19 12:06:35' WHERE id = 1292;
UPDATE trip_booking.all_booking SET expires = '2027-05-22 07:13:19' WHERE id = 1293;
UPDATE trip_booking.all_booking SET expires = '2027-06-04 18:48:37' WHERE id = 1294;
UPDATE trip_booking.all_booking SET expires = '2027-06-05 08:49:38' WHERE id = 1295;
UPDATE trip_booking.all_booking SET expires = '2027-06-07 15:33:47' WHERE id = 1296;
UPDATE trip_booking.all_booking SET expires = '2027-06-14 14:54:52' WHERE id = 1297;
UPDATE trip_booking.all_booking SET expires = '2027-06-18 08:59:52' WHERE id = 1298;
UPDATE trip_booking.all_booking SET expires = '2027-06-21 18:52:21' WHERE id = 1299;
UPDATE trip_booking.all_booking SET expires = '2027-06-30 12:22:43' WHERE id = 1300;
UPDATE trip_booking.all_booking SET expires = '2027-06-30 16:59:57' WHERE id = 1301;
UPDATE trip_booking.all_booking SET expires = '2027-07-01 20:38:17' WHERE id = 1302;
UPDATE trip_booking.all_booking SET expires = '2027-07-04 05:23:08' WHERE id = 1303;
UPDATE trip_booking.all_booking SET expires = '2027-07-04 10:56:03' WHERE id = 1304;
UPDATE trip_booking.all_booking SET expires = '2027-07-13 06:06:12' WHERE id = 1305;
UPDATE trip_booking.all_booking SET expires = '2027-07-14 13:15:45' WHERE id = 1306;
UPDATE trip_booking.all_booking SET expires = '2027-07-15 07:09:56' WHERE id = 1307;
UPDATE trip_booking.all_booking SET expires = '2027-07-25 12:23:23' WHERE id = 1308;
UPDATE trip_booking.all_booking SET expires = '2027-07-28 12:43:42' WHERE id = 1309;
UPDATE trip_booking.all_booking SET expires = '2027-07-30 14:57:00' WHERE id = 1310;
UPDATE trip_booking.all_booking SET expires = '2027-08-05 11:22:26' WHERE id = 1311;
UPDATE trip_booking.all_booking SET expires = '2027-08-06 17:25:31' WHERE id = 1312;
UPDATE trip_booking.all_booking SET expires = '2027-08-08 08:34:57' WHERE id = 1313;
UPDATE trip_booking.all_booking SET expires = '2027-08-08 10:16:08' WHERE id = 1314;
UPDATE trip_booking.all_booking SET expires = '2027-08-09 23:54:55' WHERE id = 1315;
UPDATE trip_booking.all_booking SET expires = '2027-08-11 05:52:22' WHERE id = 1316;
UPDATE trip_booking.all_booking SET expires = '2027-08-11 06:11:36' WHERE id = 1317;
UPDATE trip_booking.all_booking SET expires = '2027-08-12 19:07:52' WHERE id = 1318;
UPDATE trip_booking.all_booking SET expires = '2027-08-13 19:49:42' WHERE id = 1319;
UPDATE trip_booking.all_booking SET expires = '2027-08-17 07:00:07' WHERE id = 1320;
UPDATE trip_booking.all_booking SET expires = '2027-08-17 18:11:06' WHERE id = 1321;
UPDATE trip_booking.all_booking SET expires = '2027-08-19 07:33:05' WHERE id = 1322;
UPDATE trip_booking.all_booking SET expires = '2027-08-20 09:38:43' WHERE id = 1323;
UPDATE trip_booking.all_booking SET expires = '2027-08-27 16:31:22' WHERE id = 1324;
UPDATE trip_booking.all_booking SET expires = '2027-08-28 08:45:07' WHERE id = 1325;
UPDATE trip_booking.all_booking SET expires = '2027-08-28 15:20:21' WHERE id = 1326;
UPDATE trip_booking.all_booking SET expires = '2027-08-29 04:37:01' WHERE id = 1327;
UPDATE trip_booking.all_booking SET expires = '2027-09-08 09:28:56' WHERE id = 1328;
UPDATE trip_booking.all_booking SET expires = '2027-09-08 13:06:25' WHERE id = 1329;
UPDATE trip_booking.all_booking SET expires = '2027-09-08 14:54:59' WHERE id = 1330;
UPDATE trip_booking.all_booking SET expires = '2027-09-09 05:30:35' WHERE id = 1331;
UPDATE trip_booking.all_booking SET expires = '2027-09-24 18:39:49' WHERE id = 1332;
UPDATE trip_booking.all_booking SET expires = '2027-09-27 16:45:19' WHERE id = 1333;
UPDATE trip_booking.all_booking SET expires = '2027-09-30 07:41:39' WHERE id = 1334;
UPDATE trip_booking.all_booking SET expires = '2027-10-02 05:51:54' WHERE id = 1335;
UPDATE trip_booking.all_booking SET expires = '2027-10-11 11:41:02' WHERE id = 1336;
UPDATE trip_booking.all_booking SET expires = '2027-10-12 14:19:40' WHERE id = 1337;
UPDATE trip_booking.all_booking SET expires = '2027-10-14 06:29:31' WHERE id = 1338;
UPDATE trip_booking.all_booking SET expires = '2027-10-16 10:29:42' WHERE id = 1339;
UPDATE trip_booking.all_booking SET expires = '2027-10-16 14:53:59' WHERE id = 1340;
UPDATE trip_booking.all_booking SET expires = '2027-10-16 20:19:08' WHERE id = 1341;
UPDATE trip_booking.all_booking SET expires = '2027-11-24 02:16:16' WHERE id = 1342;
UPDATE trip_booking.all_booking SET expires = '2027-11-25 11:15:59' WHERE id = 1343;
UPDATE trip_booking.all_booking SET expires = '2027-05-12 10:20:39' WHERE id = 1344;
UPDATE trip_booking.all_booking SET expires = '2027-06-03 10:50:14' WHERE id = 1345;
UPDATE trip_booking.all_booking SET expires = '2027-02-24 13:59:34' WHERE id = 1346;
UPDATE trip_booking.all_booking SET expires = '2026-12-24 11:36:35' WHERE id = 1347;
UPDATE trip_booking.all_booking SET expires = '2027-03-17 16:14:43' WHERE id = 1348;
UPDATE trip_booking.all_booking SET expires = '2027-07-29 17:30:43' WHERE id = 1349;
UPDATE trip_booking.all_booking SET expires = '2026-10-27 10:00:02' WHERE id = 1350;
UPDATE trip_booking.all_booking SET expires = '2025-11-29 15:19:15' WHERE id = 1351;
UPDATE trip_booking.all_booking SET expires = '2026-07-04 09:45:30' WHERE id = 1352;
UPDATE trip_booking.all_booking SET expires = '2026-07-04 09:45:30' WHERE id = 1353;
UPDATE trip_booking.all_booking SET expires = '2026-07-08 09:14:29' WHERE id = 1354;
UPDATE trip_booking.all_booking SET expires = '2026-08-01 09:09:05' WHERE id = 1355;
UPDATE trip_booking.all_booking SET expires = '2026-08-04 19:14:26' WHERE id = 1356;
UPDATE trip_booking.all_booking SET expires = '2026-08-06 07:25:31' WHERE id = 1357;
UPDATE trip_booking.all_booking SET expires = '2026-10-31 05:04:31' WHERE id = 1358;
UPDATE trip_booking.all_booking SET expires = '2026-11-30 18:22:41' WHERE id = 1359;
UPDATE trip_booking.all_booking SET expires = '2026-12-10 12:01:56' WHERE id = 1360;
UPDATE trip_booking.all_booking SET expires = '2027-01-27 17:04:38' WHERE id = 1361;
UPDATE trip_booking.all_booking SET expires = '2026-12-07 10:37:51' WHERE id = 1362;

SET SQL_SAFE_UPDATES = 1;