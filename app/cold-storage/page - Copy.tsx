"use client"

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Snowflake, Package, AlertTriangle, Thermometer, Settings, Wrench, LogIn, CheckCircle, Box } from "lucide-react"
import { palletRacksApi, coldRoomsApi, coldRoomLogsApi, storesApi, palletsApi, type Store, type ColdRoom, itemsApi } from "@/lib/api"

export default function ColdStoragePage() {
  // Items state for Pallet Item selection
  const [items, setItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Fetch items for Add Pallet dialog
  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const data = await itemsApi.getAll();
      setItems(data);
    } catch (e) {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  // Pallet modal state
  const [palletModal, setPalletModal] = useState<null | { type: string, data?: any }>(null);
  // Pallet Racks state
  const [palletRacks, setPalletRacks] = useState<any[]>([]);
  const [rackForm, setRackForm] = useState<any>({});
  const [rackModal, setRackModal] = useState<null | { type: string, data?: any }>(null);
  const [rackLoading, setRackLoading] = useState(false);
  // Pallets state
  const [pallets, setPallets] = useState<any[]>([]);
  const [palletForm, setPalletForm] = useState<any>({});
  const [palletLoading, setPalletLoading] = useState(false);
  // Cold Rooms state
  const [coldRooms, setColdRooms] = useState<any[]>([]);
  const [coldRoomForm, setColdRoomForm] = useState<any>({});
  const [coldRoomModal, setColdRoomModal] = useState<null | { type: string, data?: any }>(null);
  const [coldRoomLoading, setColdRoomLoading] = useState(false);
  // Stores state for Cold Room
  const [stores, setStores] = useState<any[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  // Fetch stores for Cold Room dialog
  const fetchStores = useCallback(async () => {
    setStoresLoading(true);
    try {
      const data = await storesApi.getAll();
      setStores(data);
    } catch (e) {
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  }, []);
  // Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [logForm, setLogForm] = useState<any>({});
  const [logModal, setLogModal] = useState<null | { type: string, data?: any }>(null);
  const [logLoading, setLogLoading] = useState(false);

  // Summary counts
  const totalColdRooms = coldRooms.length;
  const totalRacks = palletRacks.length;
  const totalPallets = pallets.length;
  const totalItems = items.length;

  // Pallet Racks CRUD
  const fetchPalletRacks = useCallback(async () => {
    setRackLoading(true);
    try {
      const racks = await palletRacksApi.getAll();
      setPalletRacks(racks);
    } catch (e) {
      setPalletRacks([]);
    } finally {
      setRackLoading(false);
    }
  }, []);
  const handleAddRack = async () => {
    setRackLoading(true);
    try {
      const body = {
        code: rackForm.code || `RACK-${Math.floor(Math.random() * 10000)}`,
        capacity: rackForm.capacity ? Number(rackForm.capacity) : 0,
        coldRoomId: rackForm.coldRoomId,
        status: rackForm.status || "active",
      };
      await palletRacksApi.create(body);
      setRackModal(null);
      fetchPalletRacks();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRackLoading(false);
    }
  };
  const handleEditRack = async () => {
    setRackLoading(true);
    try {
      await palletRacksApi.update(rackForm.id, rackForm);
      setRackModal(null);
      fetchPalletRacks();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRackLoading(false);
    }
  };
  const handleDeleteRack = async (id: any) => {
    if (!window.confirm("Delete this rack?")) return;
    setRackLoading(true);
    try {
      await palletRacksApi.remove(id);
      fetchPalletRacks();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRackLoading(false);
    }
  };

  // Pallets CRUD
  const fetchPallets = useCallback(async () => {
    setPalletLoading(true);
    try {
      const data = await palletsApi.getAll();
      setPallets(data);
    } catch (e) {
      setPallets([]);
    } finally {
      setPalletLoading(false);
    }
  }, []);
  const handleAddPallet = async () => {
    setPalletLoading(true);
    try {
      const body = {
        palletRackId: palletForm.palletRackId,
        itemId: palletForm.itemId,
        quantity: palletForm.quantity ? Number(palletForm.quantity) : 0,
        unit: palletForm.unit || "box",
      };
      await palletsApi.create(body);
      setPalletModal(null);
      fetchPallets();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPalletLoading(false);
    }
  };
  const handleEditPallet = async () => {
    setPalletLoading(true);
    try {
      await palletsApi.update(palletForm.id, palletForm);
      setPalletModal(null);
      fetchPallets();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPalletLoading(false);
    }
  };
  const handleDeletePallet = async (id: any) => {
    if (!window.confirm("Delete this pallet?")) return;
    setPalletLoading(true);
    try {
      await palletsApi.remove(id);
      fetchPallets();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPalletLoading(false);
    }
  };

  // Cold Rooms CRUD
  const fetchColdRooms = useCallback(async () => {
    setColdRoomLoading(true);
    try {
      const data = await coldRoomsApi.getAll();
      setColdRooms(data);
    } catch (e) {
      setColdRooms([]);
    } finally {
      setColdRoomLoading(false);
    }
  }, []);
  const handleAddColdRoom = async () => {
    setColdRoomLoading(true);
    try {
      await coldRoomsApi.create(coldRoomForm);
      setColdRoomModal(null);
      fetchColdRooms();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setColdRoomLoading(false);
    }
  };
  const handleEditColdRoom = async () => {
    setColdRoomLoading(true);
    try {
      await coldRoomsApi.update(coldRoomForm.id, coldRoomForm);
      setColdRoomModal(null);
      fetchColdRooms();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setColdRoomLoading(false);
    }
  };
  const handleDeleteColdRoom = async (id: any) => {
    if (!window.confirm("Delete this cold room?")) return;
    setColdRoomLoading(true);
    try {
      await coldRoomsApi.remove(id);
      fetchColdRooms();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setColdRoomLoading(false);
    }
  };

  // Logs CRUD
  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const data = await coldRoomLogsApi.getAll();
      setLogs(data);
    } catch (e) {
      setLogs([]);
    } finally {
      setLogLoading(false);
    }
  }, []);
  const handleAddLog = async () => {
    setLogLoading(true);
    try {
      await coldRoomLogsApi.create(logForm);
      setLogModal(null);
      fetchLogs();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLogLoading(false);
    }
  };
  const handleDeleteLog = async (id: any) => {
    if (!window.confirm("Delete this log?")) return;
    setLogLoading(true);
    try {
      await coldRoomLogsApi.remove(id);
      fetchLogs();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLogLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPalletRacks();
    fetchPallets();
    fetchColdRooms();
    fetchLogs();
    fetchItems();
    fetchStores();
  }, [fetchPalletRacks, fetchPallets, fetchColdRooms, fetchLogs, fetchItems, fetchStores]);
  return (
    <>
      {/* Total Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="flex flex-col items-center py-4">
          <Snowflake className="h-6 w-6 text-blue-400 mb-1" />
          <div className="text-2xl font-bold">{totalColdRooms}</div>
          <div className="text-xs text-muted-foreground">Cold Rooms</div>
        </Card>
        <Card className="flex flex-col items-center py-4">
          <Package className="h-6 w-6 text-green-500 mb-1" />
          <div className="text-2xl font-bold">{totalRacks}</div>
          <div className="text-xs text-muted-foreground">Racks</div>
        </Card>
        <Card className="flex flex-col items-center py-4">
          <Box className="h-6 w-6 text-yellow-500 mb-1" />
          <div className="text-2xl font-bold">{totalPallets}</div>
          <div className="text-xs text-muted-foreground">Pallets</div>
        </Card>
        <Card className="flex flex-col items-center py-4">
          <CheckCircle className="h-6 w-6 text-cyan-500 mb-1" />
          <div className="text-2xl font-bold">{totalItems}</div>
          <div className="text-xs text-muted-foreground">Items</div>
        </Card>
      </div>
      {/* ...rest of the page... */}

      {/* Cold Room Details Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {coldRooms.length === 0 ? (
          <Card className="col-span-full text-center text-muted-foreground">No cold rooms available</Card>
        ) : (
          coldRooms.map(room => {
            const occupied = room.occupied ?? 0;
            const available = (room.capacity ?? 0) - occupied;
            const status = room.status === "active" ? "Optimal" : (room.status || "Unknown");
            return (
              <Card key={room.id} className="relative shadow-md border border-gray-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Snowflake className="h-5 w-5 text-blue-400" />
                    <CardTitle className="text-lg font-semibold">{room.name}</CardTitle>
                  </div>
                  <Badge variant={status === "Optimal" ? "default" : "destructive"}>{status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex items-center gap-3">
                    <Thermometer className="h-4 w-4 text-cyan-500" />
                    <span className="font-medium">{room.temperature}°C</span>
                    <span className="text-xs text-muted-foreground">(Target: {room.targetTemp}°C)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{room.humidity}%</span>
                    <span className="text-xs text-muted-foreground">(Target: {room.targetHumidity}%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{occupied} / {room.capacity} occupied</span>
                    <Progress value={room.capacity ? (occupied / room.capacity) * 100 : 0} className="w-24 h-2" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Available racks: {room.availableRacks?.length ?? 0}</span>
                  </div>
                  {room.availableRacks && room.availableRacks.length > 0 && (
                    <div className="bg-muted rounded p-2 mt-1">
                      <div className="text-xs font-semibold mb-1 text-muted-foreground">Rack Details</div>
                      <div className="space-y-1">
                        {room.availableRacks.map((rack: any) => (
                          <div key={rack.id} className="flex items-center gap-3 text-xs">
                            <span className="font-mono bg-gray-100 rounded px-2 py-0.5 text-gray-700">{rack.code}</span>
                            <span>Capacity: {rack.capacity}</span>
                            <span>Available: {rack.available}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Wrench className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Next Maintenance:</span>
                    <span className="text-xs text-muted-foreground">{room.nextMaintenance ? new Date(room.nextMaintenance).toLocaleDateString() : "-"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <LogIn className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">Store:</span>
                    <span className="text-xs text-muted-foreground">{room.Store?.name || "-"}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Cold Rooms Management Table */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cold Rooms</CardTitle>
          <Button onClick={() => { setColdRoomForm({}); setColdRoomModal({ type: "add" }) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Cold Room
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>Humidity</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coldRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No cold rooms available
                  </TableCell>
                </TableRow>
              ) : (
                coldRooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell>{room.name}</TableCell>
                    <TableCell>{room.temperature}°C</TableCell>
                    <TableCell>{room.humidity}%</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell><Badge>{room.status === "active" ? "Optimal" : (room.status || "Unknown")}</Badge></TableCell>
                    <TableCell className="flex flex-wrap gap-2">
                      <Button variant="outline" size="icon" title="Edit" onClick={() => { setColdRoomForm(room); setColdRoomModal({ type: "edit" }) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" title="Delete" onClick={() => handleDeleteColdRoom(room.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cold Room Logs Management */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cold Room Logs</CardTitle>
          <Button onClick={() => { setLogForm({}); setLogModal({ type: "add" }) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Log
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Temp (°C)</TableHead>
                <TableHead>Humidity (%)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No logs available
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</TableCell>
                    <TableCell>{coldRooms.find(cr => cr.id === log.coldRoomId)?.name || log.coldRoomId}</TableCell>
                    <TableCell>{log.temperature}</TableCell>
                    <TableCell>{log.humidity}</TableCell>
                    <TableCell><Badge>{log.status}</Badge></TableCell>
                    <TableCell className="flex flex-wrap gap-2">
                      <Button variant="outline" size="icon" title="Delete" onClick={() => handleDeleteLog(log.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pallet Racks Management */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pallet Racks</CardTitle>
          <Button onClick={() => { setRackForm({}); setRackModal({ type: "add" }) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Rack
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Rack Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {palletRacks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No racks available
                  </TableCell>
                </TableRow>
              ) : (
                palletRacks.map((rack) => (
                  <TableRow key={rack.id}>
                    <TableCell>{rack.name || rack.code}</TableCell>
                    <TableCell>{coldRooms.find(cr => cr.id === rack.coldRoomId)?.name || '-'}</TableCell>
                    <TableCell>{rack.capacity || '-'}</TableCell>
                    <TableCell className="flex flex-wrap gap-2">
                      <Button variant="outline" size="icon" title="Edit" onClick={() => { setRackForm(rack); setRackModal({ type: "edit" }) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" title="Delete" onClick={() => handleDeleteRack(rack.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pallets Management */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pallets</CardTitle>
          <Button onClick={() => { setPalletForm({}); setPalletModal({ type: "add" }) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Pallet
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Pallet Name</TableHead>
                <TableHead>Rack</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pallets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No pallets available
                  </TableCell>
                </TableRow>
              ) : (
                pallets.map((pallet) => (
                  <TableRow key={pallet.id}>
                    <TableCell>{pallet.name || pallet.id}</TableCell>
                    <TableCell>{pallet.palletRackId ? (palletRacks.find(r => r.id === pallet.palletRackId)?.code || pallet.palletRackId) : '-'}</TableCell>
                    <TableCell>{pallet.quantity}</TableCell>
                    <TableCell>{pallet.unit}</TableCell>
                    <TableCell className="flex flex-wrap gap-2">
                      <Button variant="outline" size="icon" title="Edit" onClick={() => { setPalletForm(pallet); setPalletModal({ type: "edit" }) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" title="Delete" onClick={() => handleDeletePallet(pallet.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs for CRUD */}
      {/* Rack Dialog */}
      <Dialog open={!!rackModal} onOpenChange={v => !v && setRackModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rackModal?.type === "edit" ? "Edit Rack" : "Add Rack"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Code</Label>
            <Input value={rackForm.code || ""} onChange={e => setRackForm((f: any) => ({ ...f, code: e.target.value }))} />
            <Label>Capacity</Label>
            <Input type="number" value={rackForm.capacity || ""} onChange={e => setRackForm((f: any) => ({ ...f, capacity: e.target.value }))} />
            <Label>Cold Room</Label>
            <Select value={rackForm.coldRoomId || ""} onValueChange={v => setRackForm((f: any) => ({ ...f, coldRoomId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Cold Room" /></SelectTrigger>
              <SelectContent>
                {coldRooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Status</Label>
            <Select value={rackForm.status || "active"} onValueChange={v => setRackForm((f: any) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setRackModal(null)} variant="outline">Cancel</Button>
              <Button onClick={rackModal?.type === "edit" ? handleEditRack : handleAddRack} disabled={rackLoading}>
                {rackModal?.type === "edit" ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pallet Dialog */}
      <Dialog open={!!palletModal} onOpenChange={v => !v && setPalletModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{palletModal?.type === "edit" ? "Edit Pallet" : "Add Pallet"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Rack</Label>
            <Select value={palletForm.palletRackId || ""} onValueChange={v => setPalletForm((f: any) => ({ ...f, palletRackId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Rack" /></SelectTrigger>
              <SelectContent>
                {palletRacks.map(rack => (
                  <SelectItem key={rack.id} value={rack.id}>{rack.name || rack.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Item</Label>
            <Select value={palletForm.itemId || ""} onValueChange={v => setPalletForm((f: any) => ({ ...f, itemId: v }))}>
              <SelectTrigger><SelectValue placeholder={itemsLoading ? "Loading..." : "Select Item"} /></SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Quantity</Label>
            <Input type="number" value={palletForm.quantity || ""} onChange={e => setPalletForm((f: any) => ({ ...f, quantity: e.target.value }))} />
            <Label>Unit</Label>
            <Input value={palletForm.unit || ""} onChange={e => setPalletForm((f: any) => ({ ...f, unit: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setPalletModal(null)} variant="outline">Cancel</Button>
              <Button onClick={palletModal?.type === "edit" ? handleEditPallet : handleAddPallet} disabled={palletLoading}>
                {palletModal?.type === "edit" ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cold Room Dialog */}
      <Dialog open={!!coldRoomModal} onOpenChange={v => !v && setColdRoomModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{coldRoomModal?.type === "edit" ? "Edit Cold Room" : "Add Cold Room"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={coldRoomForm.name || ""} onChange={e => setColdRoomForm((f: any) => ({ ...f, name: e.target.value }))} />
            <Label>Store</Label>
            <Select value={coldRoomForm.storeId || ""} onValueChange={v => setColdRoomForm((f: any) => ({ ...f, storeId: v }))}>
              <SelectTrigger><SelectValue placeholder={storesLoading ? "Loading..." : "Select Store"} /></SelectTrigger>
              <SelectContent>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Temperature</Label>
            <Input type="number" value={coldRoomForm.temperature || ""} onChange={e => setColdRoomForm((f: any) => ({ ...f, temperature: e.target.value }))} />
            <Label>Humidity</Label>
            <Input type="number" value={coldRoomForm.humidity || ""} onChange={e => setColdRoomForm((f: any) => ({ ...f, humidity: e.target.value }))} />
            <Label>Capacity</Label>
            <Input type="number" value={coldRoomForm.capacity || ""} onChange={e => setColdRoomForm((f: any) => ({ ...f, capacity: e.target.value }))} />
            <div className="flex items-center gap-2">
              <input
                id="coldRoomStatus"
                type="checkbox"
                checked={coldRoomForm.status === "active"}
                onChange={e => setColdRoomForm((f: any) => ({ ...f, status: e.target.checked ? "active" : "inactive" }))}
              />
              <Label htmlFor="coldRoomStatus">Active</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setColdRoomModal(null)} variant="outline">Cancel</Button>
              <Button onClick={coldRoomModal?.type === "edit" ? handleEditColdRoom : handleAddColdRoom} disabled={coldRoomLoading}>
                {coldRoomModal?.type === "edit" ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Dialog */}
      <Dialog open={!!logModal} onOpenChange={v => !v && setLogModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Cold Room</Label>
            <Select value={logForm.coldRoomId || ""} onValueChange={v => setLogForm((f: any) => ({ ...f, coldRoomId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Cold Room" /></SelectTrigger>
              <SelectContent>
                {coldRooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Timestamp</Label>
            <Input type="datetime-local" value={logForm.timestamp || ""} onChange={e => setLogForm((f: any) => ({ ...f, timestamp: e.target.value }))} />
            <Label>Temperature</Label>
            <Input type="number" value={logForm.temperature || ""} onChange={e => setLogForm((f: any) => ({ ...f, temperature: e.target.value }))} />
            <Label>Humidity</Label>
            <Input type="number" value={logForm.humidity || ""} onChange={e => setLogForm((f: any) => ({ ...f, humidity: e.target.value }))} />
            <Label>Status</Label>
            <Select value={logForm.status || "ok"} onValueChange={v => setLogForm((f: any) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setLogModal(null)} variant="outline">Cancel</Button>
              <Button onClick={handleAddLog} disabled={logLoading}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
