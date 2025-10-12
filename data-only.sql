--
-- PostgreSQL database dump
--

\restrict LFT9BOyqJV1qnmo3obpaSoTBAh2DvUVj79SW9p9df1e5sA4DXYRM6KD0YM0gp1E

-- Dumped from database version 16.10 (Debian 16.10-1.pgdg13+1)
-- Dumped by pg_dump version 16.10 (Debian 16.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: DeviceDefinition; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DeviceDefinition" (id, category, name, "alarmAlert", "warningAlert", price, provider) FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, name, "createdAt", identyficator, password, "phoneNumber", role, status, "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: WarehouseLocation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."WarehouseLocation" (id, name, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LocationTransfer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LocationTransfer" (id, "fromLocationId", "toLocationId", status, notes, "createdAt", "requestedById", "confirmedById", "confirmedAt") FROM stdin;
\.


--
-- Data for Name: MaterialDefinition; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MaterialDefinition" (id, name, "alarmAlert", index, "warningAlert", unit, price) FROM stdin;
\.


--
-- Data for Name: Warehouse; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Warehouse" (id, "itemType", name, category, "serialNumber", quantity, unit, price, status, "assignedToId", "createdAt", "updatedAt", "alarmAlert", index, "warningAlert", "materialDefinitionId", "transferPending", "transferToId", subcategory, "locationId") FROM stdin;
\.


--
-- Data for Name: LocationTransferLine; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LocationTransferLine" (id, "transferId", "itemType", "warehouseItemId", "materialDefinitionId", quantity, unit, "nameSnapshot", "indexSnapshot", category) FROM stdin;
\.


--
-- Data for Name: OperatorDefinition; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OperatorDefinition" (operator) FROM stdin;
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Order" (id, "orderNumber", date, "timeSlot", "clientPhoneNumber", notes, status, county, municipality, city, street, "postalCode", "assignedToId", "createdAt", "updatedAt", "createdSource", operator, type, "closedAt", "failureReason", "transferPending", "transferToId", "completedAt") FROM stdin;
\.


--
-- Data for Name: OrderEquipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrderEquipment" (id, "orderId", "warehouseId") FROM stdin;
\.


--
-- Data for Name: OrderMaterial; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrderMaterial" (id, "orderId", "materialId", quantity, unit) FROM stdin;
\.


--
-- Data for Name: OrderService; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrderService" (id, "orderId", type, "deviceId", "serialNumber", "deviceId2", "serialNumber2", "speedTest", "usDbmDown", "usDbmUp", "createdAt", notes) FROM stdin;
\.


--
-- Data for Name: RateDefinition; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RateDefinition" (id, code, amount) FROM stdin;
\.


--
-- Data for Name: TechnicianSettings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TechnicianSettings" ("userId", "workingDaysGoal", "revenueGoal", "updatedAt") FROM stdin;
\.


--
-- Data for Name: WarehouseHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."WarehouseHistory" (id, "warehouseItemId", action, "performedById", "assignedToId", "actionDate", notes, quantity, "assignedOrderId", "fromLocationId", "locationTransferId", "toLocationId") FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

\unrestrict LFT9BOyqJV1qnmo3obpaSoTBAh2DvUVj79SW9p9df1e5sA4DXYRM6KD0YM0gp1E

