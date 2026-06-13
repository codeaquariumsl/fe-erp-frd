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
import { Plus, Edit, Trash2, Snowflake, Package, AlertTriangle, Thermometer, Settings, Wrench, LogIn, CheckCircle, Box, Warehouse, Scale, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { palletRacksApi, coldRoomsApi, coldRoomLogsApi, storesApi, palletsApi, type Store, type ColdRoom, itemsApi } from "@/lib/api"
import { ERPLayout } from "@/components/layouts/erp-layout";
import ColdRoomLayout from "./cold-room-layout";

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

  // Pagination and filtering state for Pallet Racks
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [coldRoomFilter, setColdRoomFilter] = useState<string>("ALL");
  const [itemFilter, setItemFilter] = useState<string>("ALL");
  const [grnFilter, setGrnFilter] = useState<string>("");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

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
    // Validation: check rack pallet count (capacity = max pallets)
    const rack = palletRacks.find(r => r.id === palletForm.palletRackId);
    if (!rack) {
      alert("Please select a valid rack.");
      return;
    }
    const rackPallets = pallets.filter(p => p.palletRackId === rack.id);
    if (rackPallets.length >= Number(rack.capacity)) {
      alert(`Cannot add pallet: rack already has maximum number of pallets (${rack.capacity}).`);
      return;
    }
    setPalletLoading(true);
    try {
      const body = {
        palletRackId: palletForm.palletRackId,
        itemId: palletForm.itemId,
        quantity: palletForm.quantity,
        unit: "box",
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
    // Validation: check rack pallet count (excluding this pallet)
    const rack = palletRacks.find(r => r.id === palletForm.palletRackId);
    if (!rack) {
      alert("Please select a valid rack.");
      return;
    }
    const rackPallets = pallets.filter(p => p.palletRackId === rack.id && p.id !== palletForm.id);
    if (rackPallets.length >= Number(rack.capacity)) {
      alert(`Cannot update pallet: rack already has maximum number of pallets (${rack.capacity}).`);
      return;
    }
    setPalletLoading(true);
    try {
      await palletsApi.update(palletForm.id, { ...palletForm, unit: "box" });
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

  // Reset pagination when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [coldRoomFilter, itemFilter, grnFilter, showOnlyAvailable]);

  return (
    <ERPLayout>
      {/* Cold Storage Grid View */}
      {coldRooms.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Snowflake className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Cold Rooms</h3>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              Get started by adding your first cold room to begin managing your cold storage inventory.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {coldRooms.map(room => (
            <ColdRoomLayout
              key={room.id}
              coldRoom={room}
              racks={palletRacks.filter(rack => rack.coldRoomId === room.id)}
            />
          ))}
        </div>
      )}

      {/* Pallet Racks Management */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pallet Racks</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              {/* Cold Room Filter */}
              <div className="flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-gray-500" />
                <Select value={coldRoomFilter} onValueChange={setColdRoomFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Cold Room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Cold Rooms</SelectItem>
                    {coldRooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Item Filter */}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <Select value={itemFilter} onValueChange={setItemFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Items</SelectItem>
                    {items.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.color} {item.name} ({item.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* GRN Filter */}
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search GRN Number"
                  value={grnFilter}
                  onChange={(e) => setGrnFilter(e.target.value)}
                  className="w-48"
                />
              </div>

              {/* Available Filter */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showOnlyAvailable}
                    onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Show Only Available
                </label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {(() => {
            // Apply all filters
            const filteredRacks = palletRacks.filter(rack => {
              // Cold Room filter
              if (coldRoomFilter !== "ALL" && rack.coldRoomId !== coldRoomFilter) return false;

              // Available quantity filter
              if (showOnlyAvailable && (!rack.availableQty || rack.availableQty <= 0)) return false;

              // Item filter
              if (itemFilter !== "ALL" && (!rack.itemSummary || !rack.itemSummary.some((item: { itemId: { toString: () => string; }; }) => item.itemId.toString() === itemFilter))) return false;

              // GRN filter (case-insensitive)
              if (grnFilter !== "") {
                const grnFilterLower = grnFilter.toLowerCase();
                const hasMatchingGrn = rack.itemSummary?.some((item: { grns: any[]; }) =>
                  item.grns.some((grn: string) => grn.toLowerCase().includes(grnFilterLower))
                );
                if (!hasMatchingGrn) return false;
              }

              return true;
            });

            // Pagination calculations
            const totalItems = filteredRacks.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedRacks = filteredRacks.slice(startIndex, endIndex);

            // Reset to page 1 if current page is beyond available pages
            if (currentPage > totalPages && totalPages > 0) {
              setCurrentPage(1);
            }

            return (
              <>
                <Table className="min-w-full text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rack Code</TableHead>
                      <TableHead>Cold Room</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>GRNs</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Weight</TableHead>
                      {/* <TableHead>Utilization</TableHead> */}
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRacks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {filteredRacks.length === 0 && coldRoomFilter ?
                            "No racks found for selected cold room" :
                            "No racks available"
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRacks.map((rack) => {
                        // const utilizationPercentage = rack.capacity > 0 ? (rack.availableQty / rack.capacity) * 100 : 0;

                        return (
                          <TableRow key={rack.id}>
                            <TableCell className="font-medium">{rack.code}</TableCell>
                            <TableCell>{coldRooms.find(cr => cr.id === rack.coldRoomId)?.name || '-'}</TableCell>
                            <TableCell>
                              {rack.itemSummary?.map((item: { itemId: React.Key | null | undefined; color: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; itemName: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; country: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, index: number) => (
                                <div key={item.itemId} className={index > 0 ? 'mt-1' : ''}>
                                  <span className="text-sm">{item.color} {item.itemName} {item.country}</span>
                                  {/* <div className="text-xs text-gray-500">Qty: {item.totalAvailableQty}</div> */}
                                </div>
                              )) || '-'}
                            </TableCell>
                            <TableCell>
                              {rack.itemSummary?.map((item: { grns: string[]; }) =>
                                item.grns.map((grn: string, index: number) => (
                                  <div key={`${rack.id}-${grn}-${index}`} className={index > 0 ? 'mt-1' : ''}>
                                    <Badge variant="outline" className="text-xs">{grn}</Badge>
                                    {/* <div className="text-xs text-gray-500"> Qty: {item.totalQty}</div> */}
                                  </div>
                                ))
                              ) || '-'}
                            </TableCell>
                            <TableCell>{rack.capacity || 0} boxes</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span className="font-medium text-green-600">{rack.availableQty || 0} boxes</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {rack.weight ? `${rack.weight} kg` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={rack.status === 'active' ? 'default' : 'secondary'}
                                className={rack.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                              >
                                {rack.status || 'unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="flex flex-wrap gap-2">
                              <Button variant="outline" size="icon" title="Edit" onClick={() => { setRackForm(rack); setRackModal({ type: "edit" }) }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              {/* <Button variant="outline" size="icon" title="Delete" onClick={() => handleDeleteRack(rack.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button> */}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 px-2">
                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} racks
                      {coldRoomFilter && ` in ${coldRooms.find(r => r.id === coldRoomFilter)?.name}`}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => {
                          const page = i + 1;
                          const isCurrentPage = page === currentPage;

                          // Show first, last, current, and adjacent pages
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={isCurrentPage ? "default" : "outline"}
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return <span key={page} className="text-gray-400">...</span>;
                          }
                          return null;
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Cold Rooms Management Table */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cold Rooms</CardTitle>
          {/* <Button onClick={() => { setColdRoomForm({}); setColdRoomModal({ type: "add" }) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Cold Room
          </Button> */}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Store</TableHead>
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
                    <TableCell>{room.Store.name}</TableCell>
                    <TableCell>{room.temperature}°C</TableCell>
                    <TableCell>{room.humidity}%</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell><Badge>{room.status === "active" ? "Optimal" : (room.status || "Unknown")}</Badge></TableCell>
                    <TableCell className="flex flex-wrap gap-2">
                      <Button variant="outline" size="icon" title="Edit" onClick={() => { setColdRoomForm(room); setColdRoomModal({ type: "edit" }) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {/* <Button variant="outline" size="icon" title="Delete" onClick={() => handleDeleteColdRoom(room.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button> */}
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

      {/* Pallets Management */}
      <Card className="mb-6">
        {/* <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Pallets</CardTitle>
          <Button onClick={() => { setPalletForm({}); setPalletModal({ type: "add" }) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Pallet
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Pallet ID</TableHead>
                <TableHead>Rack</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                // Flatten all pallets from all racks
                const allPallets = palletRacks.flatMap(rack =>
                  (rack.Pallets || []).map(pallet => ({
                    ...pallet,
                    rackCode: rack.code,
                    rackId: rack.id
                  }))
                );

                if (allPallets.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No pallets available
                      </TableCell>
                    </TableRow>
                  );
                }

                return allPallets.map((pallet) => (
                  <TableRow key={pallet.id}>
                    <TableCell className="font-medium">#{pallet.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{pallet.rackCode}</Badge>
                    </TableCell>
                    <TableCell>
                      {items.find(item => item.id === pallet.itemId)?.name || `Item #${pallet.itemId}`}
                    </TableCell>
                    <TableCell className="font-medium">{pallet.quantity}</TableCell>
                    <TableCell>{pallet.unit}</TableCell>
                    <TableCell>
                      <Badge
                        variant={pallet.status === 'stored' ? 'default' : 'secondary'}
                        className={pallet.status === 'stored' ? 'bg-blue-100 text-blue-800' : ''}
                      >
                        {pallet.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(pallet.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="flex flex-wrap gap-2">
                      <Button variant="outline" size="icon" title="Edit" onClick={() => { setPalletForm(pallet); setPalletModal({ type: "edit" }) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" title="Delete" onClick={() => handleDeletePallet(pallet.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </CardContent> */}
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
          <div className="space-y-2">
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
                  <SelectItem key={item.id} value={item.id}>
                    {item.color + ' ' + item.name + ' ' + item.country + ' (' + item.temperature + "°C)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Quantity (Box)</Label>
            <Input type="number" value={palletForm.quantity || ""} onChange={e => setPalletForm((f: any) => ({ ...f, quantity: e.target.value }))} />
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
    </ERPLayout>
  );
}
