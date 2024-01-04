// Generator : SpinalHDL v1.9.4    git head : 270018552577f3bb8e5339ee2583c9c22d324215
// Component : AccVectorAdd
// Git hash  : 0ee897d03952d4addf4e19604c61479bb9aa2e34

// `timescale 1ns/1ps

module AccVectorAdd (
  output wire          memAxi_awvalid,
  input  wire          memAxi_awready,
  output wire [33:0]   memAxi_awaddr,
  output wire [1:0]    memAxi_awid,
  output wire [7:0]    memAxi_awlen,
  output wire [2:0]    memAxi_awsize,
  output wire [1:0]    memAxi_awburst,
  output wire [2:0]    memAxi_awprot,
  output wire          memAxi_wvalid,
  input  wire          memAxi_wready,
  output wire [511:0]  memAxi_wdata,
  output wire [63:0]   memAxi_wstrb,
  output wire          memAxi_wlast,
  input  wire          memAxi_bvalid,
  output wire          memAxi_bready,
  input  wire [1:0]    memAxi_bid,
  input  wire [1:0]    memAxi_bresp,
  output wire          memAxi_arvalid,
  input  wire          memAxi_arready,
  output wire [33:0]   memAxi_araddr,
  output wire [1:0]    memAxi_arid,
  output wire [7:0]    memAxi_arlen,
  output wire [2:0]    memAxi_arsize,
  output wire [1:0]    memAxi_arburst,
  output wire [2:0]    memAxi_arprot,
  input  wire          memAxi_rvalid,
  output wire          memAxi_rready,
  input  wire [511:0]  memAxi_rdata,
  input  wire [1:0]    memAxi_rid,
  input  wire [1:0]    memAxi_rresp,
  input  wire          memAxi_rlast,
  input  wire          cci_awvalid,
  output wire          cci_awready,
  input  wire [11:0]   cci_awaddr,
  input  wire [2:0]    cci_awprot,
  input  wire          cci_wvalid,
  output wire          cci_wready,
  input  wire [63:0]   cci_wdata,
  input  wire [7:0]    cci_wstrb,
  output wire          cci_bvalid,
  input  wire          cci_bready,
  output wire [1:0]    cci_bresp,
  input  wire          cci_arvalid,
  output wire          cci_arready,
  input  wire [11:0]   cci_araddr,
  input  wire [2:0]    cci_arprot,
  output wire          cci_rvalid,
  input  wire          cci_rready,
  output wire [63:0]   cci_rdata,
  output wire [1:0]    cci_rresp,
  input  wire [63:0]   io_nextCciSubordinateOffset,
  input  wire [127:0]  io_uuid,
  output wire          io_transfer_valid,
  input  wire          io_transfer_ready,
  output wire [7:0]    io_transfer_payload_mrIndex,
  output wire [55:0]   io_transfer_payload_address,
  output wire [31:0]   io_transfer_payload_length,
  input  wire          clk,
  input  wire          reset
);

  wire       [33:0]   readerA_io_cmd_payload_baseAddr;
  wire       [33:0]   readerA_io_cmd_payload_burstLen;
  wire       [33:0]   readerB_io_cmd_payload_baseAddr;
  wire       [33:0]   readerB_io_cmd_payload_burstLen;
  wire       [33:0]   writerC_io_cmd_payload_baseAddr;
  wire       [33:0]   writerC_io_cmd_payload_burstLen;
  wire                toplevel_readerA_io_data_fifo_io_flush;
  wire                toplevel_readerB_io_data_fifo_io_flush;
  wire                toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_ready;
  wire                toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_flush;
  wire                done_toStream_fifo_io_flush;
  wire                cciRegisters_io_cci_aw_ready;
  wire                cciRegisters_io_cci_w_ready;
  wire                cciRegisters_io_cci_b_valid;
  wire       [1:0]    cciRegisters_io_cci_b_payload_resp;
  wire                cciRegisters_io_cci_ar_ready;
  wire                cciRegisters_io_cci_r_valid;
  wire       [63:0]   cciRegisters_io_cci_r_payload_data;
  wire       [1:0]    cciRegisters_io_cci_r_payload_resp;
  wire                cciRegisters_io_memoryRegions_valid;
  wire       [7:0]    cciRegisters_io_memoryRegions_payload_0_mrIndex;
  wire       [55:0]   cciRegisters_io_memoryRegions_payload_0_address;
  wire       [31:0]   cciRegisters_io_memoryRegions_payload_0_length;
  wire       [7:0]    cciRegisters_io_memoryRegions_payload_1_mrIndex;
  wire       [55:0]   cciRegisters_io_memoryRegions_payload_1_address;
  wire       [31:0]   cciRegisters_io_memoryRegions_payload_1_length;
  wire       [7:0]    cciRegisters_io_memoryRegions_payload_2_mrIndex;
  wire       [55:0]   cciRegisters_io_memoryRegions_payload_2_address;
  wire       [31:0]   cciRegisters_io_memoryRegions_payload_2_length;
  wire                readerA_io_bus_ar_valid;
  wire       [33:0]   readerA_io_bus_ar_payload_addr;
  wire       [0:0]    readerA_io_bus_ar_payload_id;
  wire       [7:0]    readerA_io_bus_ar_payload_len;
  wire       [2:0]    readerA_io_bus_ar_payload_size;
  wire       [1:0]    readerA_io_bus_ar_payload_burst;
  wire       [2:0]    readerA_io_bus_ar_payload_prot;
  wire                readerA_io_bus_r_ready;
  wire                readerA_io_cmd_ready;
  wire                readerA_io_data_valid;
  wire       [511:0]  readerA_io_data_payload;
  wire                readerA_reset_syncronized;
  wire                readerB_io_bus_ar_valid;
  wire       [33:0]   readerB_io_bus_ar_payload_addr;
  wire       [0:0]    readerB_io_bus_ar_payload_id;
  wire       [7:0]    readerB_io_bus_ar_payload_len;
  wire       [2:0]    readerB_io_bus_ar_payload_size;
  wire       [1:0]    readerB_io_bus_ar_payload_burst;
  wire       [2:0]    readerB_io_bus_ar_payload_prot;
  wire                readerB_io_bus_r_ready;
  wire                readerB_io_cmd_ready;
  wire                readerB_io_data_valid;
  wire       [511:0]  readerB_io_data_payload;
  wire                writerC_io_bus_aw_valid;
  wire       [33:0]   writerC_io_bus_aw_payload_addr;
  wire       [1:0]    writerC_io_bus_aw_payload_id;
  wire       [7:0]    writerC_io_bus_aw_payload_len;
  wire       [2:0]    writerC_io_bus_aw_payload_size;
  wire       [1:0]    writerC_io_bus_aw_payload_burst;
  wire       [2:0]    writerC_io_bus_aw_payload_prot;
  wire                writerC_io_bus_w_valid;
  wire       [511:0]  writerC_io_bus_w_payload_data;
  wire       [63:0]   writerC_io_bus_w_payload_strb;
  wire                writerC_io_bus_w_payload_last;
  wire                writerC_io_bus_b_ready;
  wire                writerC_io_cmd_ready;
  wire                writerC_io_data_ready;
  wire                writerC_io_cmdDone;
  wire                readArbiter_io_inputs_0_ar_ready;
  wire                readArbiter_io_inputs_0_r_valid;
  wire       [511:0]  readArbiter_io_inputs_0_r_payload_data;
  wire       [0:0]    readArbiter_io_inputs_0_r_payload_id;
  wire       [1:0]    readArbiter_io_inputs_0_r_payload_resp;
  wire                readArbiter_io_inputs_0_r_payload_last;
  wire                readArbiter_io_inputs_1_ar_ready;
  wire                readArbiter_io_inputs_1_r_valid;
  wire       [511:0]  readArbiter_io_inputs_1_r_payload_data;
  wire       [0:0]    readArbiter_io_inputs_1_r_payload_id;
  wire       [1:0]    readArbiter_io_inputs_1_r_payload_resp;
  wire                readArbiter_io_inputs_1_r_payload_last;
  wire                readArbiter_io_output_ar_valid;
  wire       [33:0]   readArbiter_io_output_ar_payload_addr;
  wire       [1:0]    readArbiter_io_output_ar_payload_id;
  wire       [7:0]    readArbiter_io_output_ar_payload_len;
  wire       [2:0]    readArbiter_io_output_ar_payload_size;
  wire       [1:0]    readArbiter_io_output_ar_payload_burst;
  wire       [2:0]    readArbiter_io_output_ar_payload_prot;
  wire                readArbiter_io_output_r_ready;
  wire                toplevel_readerA_io_data_fifo_io_push_ready;
  wire                toplevel_readerA_io_data_fifo_io_pop_valid;
  wire       [511:0]  toplevel_readerA_io_data_fifo_io_pop_payload;
  wire       [6:0]    toplevel_readerA_io_data_fifo_io_occupancy;
  wire       [6:0]    toplevel_readerA_io_data_fifo_io_availability;
  wire                toplevel_readerB_io_data_fifo_io_push_ready;
  wire                toplevel_readerB_io_data_fifo_io_pop_valid;
  wire       [511:0]  toplevel_readerB_io_data_fifo_io_pop_payload;
  wire       [6:0]    toplevel_readerB_io_data_fifo_io_occupancy;
  wire       [6:0]    toplevel_readerB_io_data_fifo_io_availability;
  wire                toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_push_ready;
  wire                toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_valid;
  wire       [7:0]    toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_0_mrIndex;
  wire       [55:0]   toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_0_address;
  wire       [31:0]   toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_0_length;
  wire       [7:0]    toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_1_mrIndex;
  wire       [55:0]   toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_1_address;
  wire       [31:0]   toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_1_length;
  wire       [7:0]    toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_mrIndex;
  wire       [55:0]   toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_address;
  wire       [31:0]   toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_length;
  wire       [1:0]    toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_occupancy;
  wire       [1:0]    toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_availability;
  wire                done_toStream_fifo_io_push_ready;
  wire                done_toStream_fifo_io_pop_valid;
  wire       [1:0]    done_toStream_fifo_io_occupancy;
  wire       [1:0]    done_toStream_fifo_io_availability;
  wire       [31:0]   _zz_addedData_payload_data;
  wire       [31:0]   _zz_addedData_payload_data_1;
  wire       [31:0]   _zz_addedData_payload_data_2;
  wire       [31:0]   _zz_addedData_payload_data_3;
  wire       [31:0]   _zz_addedData_payload_data_4;
  wire       [31:0]   _zz_addedData_payload_data_5;
  wire       [31:0]   _zz_addedData_payload_data_6;
  wire       [31:0]   _zz_addedData_payload_data_7;
  wire       [31:0]   _zz_addedData_payload_data_8;
  wire       [31:0]   _zz_addedData_payload_data_9;
  wire       [31:0]   _zz_addedData_payload_data_10;
  wire       [31:0]   _zz_addedData_payload_data_11;
  wire       [31:0]   _zz_addedData_payload_data_12;
  wire       [31:0]   _zz_addedData_payload_data_13;
  wire       [31:0]   _zz_addedData_payload_data_14;
  wire       [31:0]   _zz_addedData_payload_data_15;
  wire       [31:0]   _zz_io_cmd_payload_burstLen;
  wire       [31:0]   _zz_io_cmd_payload_burstLen_1;
  wire       [31:0]   _zz_io_cmd_payload_burstLen_2;
  wire                addedData_valid;
  reg                 addedData_ready;
  wire       [511:0]  addedData_payload_data;
  wire       [63:0]   addedData_payload_strb;
  wire                toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_valid;
  wire                toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_ready;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_1;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_2;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_3;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_4;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_5;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_6;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_7;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_8;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_9;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_10;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_11;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_12;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_13;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_14;
  wire       [31:0]   toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_15;
  wire       [511:0]  _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0;
  wire                toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_valid;
  wire                toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_ready;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_1;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_2;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_3;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_4;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_5;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_6;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_7;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_8;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_9;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_10;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_11;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_12;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_13;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_14;
  wire       [31:0]   toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_15;
  wire       [511:0]  _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0;
  wire                _zz_addedData_valid;
  wire                _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_ready;
  wire                addedData_m2sPipe_valid;
  wire                addedData_m2sPipe_ready;
  wire       [511:0]  addedData_m2sPipe_payload_data;
  wire       [63:0]   addedData_m2sPipe_payload_strb;
  reg                 addedData_rValid;
  reg        [511:0]  addedData_rData_data;
  reg        [63:0]   addedData_rData_strb;
  wire                when_Stream_l369;
  wire                toplevel_cciRegisters_io_memoryRegions_toStream_valid;
  wire                toplevel_cciRegisters_io_memoryRegions_toStream_ready;
  wire       [7:0]    toplevel_cciRegisters_io_memoryRegions_toStream_payload_0_mrIndex;
  wire       [55:0]   toplevel_cciRegisters_io_memoryRegions_toStream_payload_0_address;
  wire       [31:0]   toplevel_cciRegisters_io_memoryRegions_toStream_payload_0_length;
  wire       [7:0]    toplevel_cciRegisters_io_memoryRegions_toStream_payload_1_mrIndex;
  wire       [55:0]   toplevel_cciRegisters_io_memoryRegions_toStream_payload_1_address;
  wire       [31:0]   toplevel_cciRegisters_io_memoryRegions_toStream_payload_1_length;
  wire       [7:0]    toplevel_cciRegisters_io_memoryRegions_toStream_payload_2_mrIndex;
  wire       [55:0]   toplevel_cciRegisters_io_memoryRegions_toStream_payload_2_address;
  wire       [31:0]   toplevel_cciRegisters_io_memoryRegions_toStream_payload_2_length;
  wire                _zz_io_cmd_valid;
  wire                _zz_io_pop_ready;
  reg                 _zz_io_pop_ready_1;
  wire                _zz_io_cmd_valid_1;
  wire                _zz_io_pop_ready_2;
  reg                 _zz_io_pop_ready_3;
  wire                _zz_io_cmd_valid_2;
  wire                _zz_io_pop_ready_4;
  reg                 _zz_io_pop_ready_5;
  wire                done_valid;
  wire                _zz_io_transfer_valid;
  wire                _zz_io_pop_ready_6;
  reg                 _zz_io_pop_ready_7;
  wire                done_toStream_valid;
  wire                done_toStream_ready;
  wire                _zz_io_transfer_valid_1;
  wire                _zz_io_pop_ready_8;

  assign _zz_addedData_payload_data = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_15) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_15));
  assign _zz_addedData_payload_data_1 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_14) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_14));
  assign _zz_addedData_payload_data_2 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_13) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_13));
  assign _zz_addedData_payload_data_3 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_12) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_12));
  assign _zz_addedData_payload_data_4 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_11) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_11));
  assign _zz_addedData_payload_data_5 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_10) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_10));
  assign _zz_addedData_payload_data_6 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_9) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_9));
  assign _zz_addedData_payload_data_7 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_8) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_8));
  assign _zz_addedData_payload_data_8 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_7) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_7));
  assign _zz_addedData_payload_data_9 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_6) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_6));
  assign _zz_addedData_payload_data_10 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_5) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_5));
  assign _zz_addedData_payload_data_11 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_4) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_4));
  assign _zz_addedData_payload_data_12 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_3) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_3));
  assign _zz_addedData_payload_data_13 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_2) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_2));
  assign _zz_addedData_payload_data_14 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_1) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_1));
  assign _zz_addedData_payload_data_15 = ($signed(toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0) + $signed(toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0));
  assign _zz_io_cmd_payload_burstLen = (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_0_length / 7'h40);
  assign _zz_io_cmd_payload_burstLen_1 = (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_1_length / 7'h40);
  assign _zz_io_cmd_payload_burstLen_2 = (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_length / 7'h40);
  AccRegister cciRegisters (
    .io_cci_aw_valid                    (cci_awvalid                                          ), //i
    .io_cci_aw_ready                    (cciRegisters_io_cci_aw_ready                         ), //o
    .io_cci_aw_payload_addr             (cci_awaddr[11:0]                                     ), //i
    .io_cci_aw_payload_prot             (cci_awprot[2:0]                                      ), //i
    .io_cci_w_valid                     (cci_wvalid                                           ), //i
    .io_cci_w_ready                     (cciRegisters_io_cci_w_ready                          ), //o
    .io_cci_w_payload_data              (cci_wdata[63:0]                                      ), //i
    .io_cci_w_payload_strb              (cci_wstrb[7:0]                                       ), //i
    .io_cci_b_valid                     (cciRegisters_io_cci_b_valid                          ), //o
    .io_cci_b_ready                     (cci_bready                                           ), //i
    .io_cci_b_payload_resp              (cciRegisters_io_cci_b_payload_resp[1:0]              ), //o
    .io_cci_ar_valid                    (cci_arvalid                                          ), //i
    .io_cci_ar_ready                    (cciRegisters_io_cci_ar_ready                         ), //o
    .io_cci_ar_payload_addr             (cci_araddr[11:0]                                     ), //i
    .io_cci_ar_payload_prot             (cci_arprot[2:0]                                      ), //i
    .io_cci_r_valid                     (cciRegisters_io_cci_r_valid                          ), //o
    .io_cci_r_ready                     (cci_rready                                           ), //i
    .io_cci_r_payload_data              (cciRegisters_io_cci_r_payload_data[63:0]             ), //o
    .io_cci_r_payload_resp              (cciRegisters_io_cci_r_payload_resp[1:0]              ), //o
    .io_memoryRegions_valid             (cciRegisters_io_memoryRegions_valid                  ), //o
    .io_memoryRegions_payload_0_mrIndex (cciRegisters_io_memoryRegions_payload_0_mrIndex[7:0] ), //o
    .io_memoryRegions_payload_0_address (cciRegisters_io_memoryRegions_payload_0_address[55:0]), //o
    .io_memoryRegions_payload_0_length  (cciRegisters_io_memoryRegions_payload_0_length[31:0] ), //o
    .io_memoryRegions_payload_1_mrIndex (cciRegisters_io_memoryRegions_payload_1_mrIndex[7:0] ), //o
    .io_memoryRegions_payload_1_address (cciRegisters_io_memoryRegions_payload_1_address[55:0]), //o
    .io_memoryRegions_payload_1_length  (cciRegisters_io_memoryRegions_payload_1_length[31:0] ), //o
    .io_memoryRegions_payload_2_mrIndex (cciRegisters_io_memoryRegions_payload_2_mrIndex[7:0] ), //o
    .io_memoryRegions_payload_2_address (cciRegisters_io_memoryRegions_payload_2_address[55:0]), //o
    .io_memoryRegions_payload_2_length  (cciRegisters_io_memoryRegions_payload_2_length[31:0] ), //o
    .io_nextCciSubordinateOffset        (io_nextCciSubordinateOffset[63:0]                    ), //i
    .io_uuid                            (io_uuid[127:0]                                       ), //i
    .clk                                (clk                                                  ), //i
    .reset                              (reset                                                )  //i
  );
  SimpleAxi4ReadDma readerA (
    .io_bus_ar_valid         (readerA_io_bus_ar_valid                      ), //o
    .io_bus_ar_ready         (readArbiter_io_inputs_0_ar_ready             ), //i
    .io_bus_ar_payload_addr  (readerA_io_bus_ar_payload_addr[33:0]         ), //o
    .io_bus_ar_payload_id    (readerA_io_bus_ar_payload_id                 ), //o
    .io_bus_ar_payload_len   (readerA_io_bus_ar_payload_len[7:0]           ), //o
    .io_bus_ar_payload_size  (readerA_io_bus_ar_payload_size[2:0]          ), //o
    .io_bus_ar_payload_burst (readerA_io_bus_ar_payload_burst[1:0]         ), //o
    .io_bus_ar_payload_prot  (readerA_io_bus_ar_payload_prot[2:0]          ), //o
    .io_bus_r_valid          (readArbiter_io_inputs_0_r_valid              ), //i
    .io_bus_r_ready          (readerA_io_bus_r_ready                       ), //o
    .io_bus_r_payload_data   (readArbiter_io_inputs_0_r_payload_data[511:0]), //i
    .io_bus_r_payload_id     (readArbiter_io_inputs_0_r_payload_id         ), //i
    .io_bus_r_payload_resp   (readArbiter_io_inputs_0_r_payload_resp[1:0]  ), //i
    .io_bus_r_payload_last   (readArbiter_io_inputs_0_r_payload_last       ), //i
    .io_cmd_valid            (_zz_io_cmd_valid                             ), //i
    .io_cmd_ready            (readerA_io_cmd_ready                         ), //o
    .io_cmd_payload_baseAddr (readerA_io_cmd_payload_baseAddr[33:0]        ), //i
    .io_cmd_payload_burstLen (readerA_io_cmd_payload_burstLen[33:0]        ), //i
    .io_data_valid           (readerA_io_data_valid                        ), //o
    .io_data_ready           (toplevel_readerA_io_data_fifo_io_push_ready  ), //i
    .io_data_payload         (readerA_io_data_payload[511:0]               ), //o
    .clk                     (clk                                          ), //i
    .reset                   (reset                                        ), //i
    .reset_syncronized       (readerA_reset_syncronized                    )  //o
  );
  SimpleAxi4ReadDma_1 readerB (
    .io_bus_ar_valid         (readerB_io_bus_ar_valid                      ), //o
    .io_bus_ar_ready         (readArbiter_io_inputs_1_ar_ready             ), //i
    .io_bus_ar_payload_addr  (readerB_io_bus_ar_payload_addr[33:0]         ), //o
    .io_bus_ar_payload_id    (readerB_io_bus_ar_payload_id                 ), //o
    .io_bus_ar_payload_len   (readerB_io_bus_ar_payload_len[7:0]           ), //o
    .io_bus_ar_payload_size  (readerB_io_bus_ar_payload_size[2:0]          ), //o
    .io_bus_ar_payload_burst (readerB_io_bus_ar_payload_burst[1:0]         ), //o
    .io_bus_ar_payload_prot  (readerB_io_bus_ar_payload_prot[2:0]          ), //o
    .io_bus_r_valid          (readArbiter_io_inputs_1_r_valid              ), //i
    .io_bus_r_ready          (readerB_io_bus_r_ready                       ), //o
    .io_bus_r_payload_data   (readArbiter_io_inputs_1_r_payload_data[511:0]), //i
    .io_bus_r_payload_id     (readArbiter_io_inputs_1_r_payload_id         ), //i
    .io_bus_r_payload_resp   (readArbiter_io_inputs_1_r_payload_resp[1:0]  ), //i
    .io_bus_r_payload_last   (readArbiter_io_inputs_1_r_payload_last       ), //i
    .io_cmd_valid            (_zz_io_cmd_valid_1                           ), //i
    .io_cmd_ready            (readerB_io_cmd_ready                         ), //o
    .io_cmd_payload_baseAddr (readerB_io_cmd_payload_baseAddr[33:0]        ), //i
    .io_cmd_payload_burstLen (readerB_io_cmd_payload_burstLen[33:0]        ), //i
    .io_data_valid           (readerB_io_data_valid                        ), //o
    .io_data_ready           (toplevel_readerB_io_data_fifo_io_push_ready  ), //i
    .io_data_payload         (readerB_io_data_payload[511:0]               ), //o
    .clk                     (clk                                          ), //i
    .reset                   (reset                                        ), //i
    .reset_syncronized       (readerA_reset_syncronized                    )  //i
  );
  SimpleAxi4WriteDma writerC (
    .io_bus_aw_valid         (writerC_io_bus_aw_valid              ), //o
    .io_bus_aw_ready         (memAxi_awready                       ), //i
    .io_bus_aw_payload_addr  (writerC_io_bus_aw_payload_addr[33:0] ), //o
    .io_bus_aw_payload_id    (writerC_io_bus_aw_payload_id[1:0]    ), //o
    .io_bus_aw_payload_len   (writerC_io_bus_aw_payload_len[7:0]   ), //o
    .io_bus_aw_payload_size  (writerC_io_bus_aw_payload_size[2:0]  ), //o
    .io_bus_aw_payload_burst (writerC_io_bus_aw_payload_burst[1:0] ), //o
    .io_bus_aw_payload_prot  (writerC_io_bus_aw_payload_prot[2:0]  ), //o
    .io_bus_w_valid          (writerC_io_bus_w_valid               ), //o
    .io_bus_w_ready          (memAxi_wready                        ), //i
    .io_bus_w_payload_data   (writerC_io_bus_w_payload_data[511:0] ), //o
    .io_bus_w_payload_strb   (writerC_io_bus_w_payload_strb[63:0]  ), //o
    .io_bus_w_payload_last   (writerC_io_bus_w_payload_last        ), //o
    .io_bus_b_valid          (memAxi_bvalid                        ), //i
    .io_bus_b_ready          (writerC_io_bus_b_ready               ), //o
    .io_bus_b_payload_id     (memAxi_bid[1:0]                      ), //i
    .io_bus_b_payload_resp   (memAxi_bresp[1:0]                    ), //i
    .io_cmd_valid            (_zz_io_cmd_valid_2                   ), //i
    .io_cmd_ready            (writerC_io_cmd_ready                 ), //o
    .io_cmd_payload_baseAddr (writerC_io_cmd_payload_baseAddr[33:0]), //i
    .io_cmd_payload_burstLen (writerC_io_cmd_payload_burstLen[33:0]), //i
    .io_data_valid           (addedData_m2sPipe_valid              ), //i
    .io_data_ready           (writerC_io_data_ready                ), //o
    .io_data_payload_data    (addedData_m2sPipe_payload_data[511:0]), //i
    .io_data_payload_strb    (addedData_m2sPipe_payload_strb[63:0] ), //i
    .io_cmdDone              (writerC_io_cmdDone                   ), //o
    .clk                     (clk                                  ), //i
    .reset                   (reset                                ), //i
    .reset_syncronized       (readerA_reset_syncronized            )  //i
  );
  Axi4ReadOnlyArbiter readArbiter (
    .io_inputs_0_ar_valid         (readerA_io_bus_ar_valid                      ), //i
    .io_inputs_0_ar_ready         (readArbiter_io_inputs_0_ar_ready             ), //o
    .io_inputs_0_ar_payload_addr  (readerA_io_bus_ar_payload_addr[33:0]         ), //i
    .io_inputs_0_ar_payload_id    (readerA_io_bus_ar_payload_id                 ), //i
    .io_inputs_0_ar_payload_len   (readerA_io_bus_ar_payload_len[7:0]           ), //i
    .io_inputs_0_ar_payload_size  (readerA_io_bus_ar_payload_size[2:0]          ), //i
    .io_inputs_0_ar_payload_burst (readerA_io_bus_ar_payload_burst[1:0]         ), //i
    .io_inputs_0_ar_payload_prot  (readerA_io_bus_ar_payload_prot[2:0]          ), //i
    .io_inputs_0_r_valid          (readArbiter_io_inputs_0_r_valid              ), //o
    .io_inputs_0_r_ready          (readerA_io_bus_r_ready                       ), //i
    .io_inputs_0_r_payload_data   (readArbiter_io_inputs_0_r_payload_data[511:0]), //o
    .io_inputs_0_r_payload_id     (readArbiter_io_inputs_0_r_payload_id         ), //o
    .io_inputs_0_r_payload_resp   (readArbiter_io_inputs_0_r_payload_resp[1:0]  ), //o
    .io_inputs_0_r_payload_last   (readArbiter_io_inputs_0_r_payload_last       ), //o
    .io_inputs_1_ar_valid         (readerB_io_bus_ar_valid                      ), //i
    .io_inputs_1_ar_ready         (readArbiter_io_inputs_1_ar_ready             ), //o
    .io_inputs_1_ar_payload_addr  (readerB_io_bus_ar_payload_addr[33:0]         ), //i
    .io_inputs_1_ar_payload_id    (readerB_io_bus_ar_payload_id                 ), //i
    .io_inputs_1_ar_payload_len   (readerB_io_bus_ar_payload_len[7:0]           ), //i
    .io_inputs_1_ar_payload_size  (readerB_io_bus_ar_payload_size[2:0]          ), //i
    .io_inputs_1_ar_payload_burst (readerB_io_bus_ar_payload_burst[1:0]         ), //i
    .io_inputs_1_ar_payload_prot  (readerB_io_bus_ar_payload_prot[2:0]          ), //i
    .io_inputs_1_r_valid          (readArbiter_io_inputs_1_r_valid              ), //o
    .io_inputs_1_r_ready          (readerB_io_bus_r_ready                       ), //i
    .io_inputs_1_r_payload_data   (readArbiter_io_inputs_1_r_payload_data[511:0]), //o
    .io_inputs_1_r_payload_id     (readArbiter_io_inputs_1_r_payload_id         ), //o
    .io_inputs_1_r_payload_resp   (readArbiter_io_inputs_1_r_payload_resp[1:0]  ), //o
    .io_inputs_1_r_payload_last   (readArbiter_io_inputs_1_r_payload_last       ), //o
    .io_output_ar_valid           (readArbiter_io_output_ar_valid               ), //o
    .io_output_ar_ready           (memAxi_arready                               ), //i
    .io_output_ar_payload_addr    (readArbiter_io_output_ar_payload_addr[33:0]  ), //o
    .io_output_ar_payload_id      (readArbiter_io_output_ar_payload_id[1:0]     ), //o
    .io_output_ar_payload_len     (readArbiter_io_output_ar_payload_len[7:0]    ), //o
    .io_output_ar_payload_size    (readArbiter_io_output_ar_payload_size[2:0]   ), //o
    .io_output_ar_payload_burst   (readArbiter_io_output_ar_payload_burst[1:0]  ), //o
    .io_output_ar_payload_prot    (readArbiter_io_output_ar_payload_prot[2:0]   ), //o
    .io_output_r_valid            (memAxi_rvalid                                ), //i
    .io_output_r_ready            (readArbiter_io_output_r_ready                ), //o
    .io_output_r_payload_data     (memAxi_rdata[511:0]                          ), //i
    .io_output_r_payload_id       (memAxi_rid[1:0]                              ), //i
    .io_output_r_payload_resp     (memAxi_rresp[1:0]                            ), //i
    .io_output_r_payload_last     (memAxi_rlast                                 ), //i
    .clk                          (clk                                          ), //i
    .reset                        (reset                                        )  //i
  );
  StreamFifo_9 toplevel_readerA_io_data_fifo (
    .io_push_valid   (readerA_io_data_valid                                         ), //i
    .io_push_ready   (toplevel_readerA_io_data_fifo_io_push_ready                   ), //o
    .io_push_payload (readerA_io_data_payload[511:0]                                ), //i
    .io_pop_valid    (toplevel_readerA_io_data_fifo_io_pop_valid                    ), //o
    .io_pop_ready    (toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_ready), //i
    .io_pop_payload  (toplevel_readerA_io_data_fifo_io_pop_payload[511:0]           ), //o
    .io_flush        (toplevel_readerA_io_data_fifo_io_flush                        ), //i
    .io_occupancy    (toplevel_readerA_io_data_fifo_io_occupancy[6:0]               ), //o
    .io_availability (toplevel_readerA_io_data_fifo_io_availability[6:0]            ), //o
    .clk             (clk                                                           ), //i
    .reset           (reset                                                         )  //i
  );
  StreamFifo_9 toplevel_readerB_io_data_fifo (
    .io_push_valid   (readerB_io_data_valid                                         ), //i
    .io_push_ready   (toplevel_readerB_io_data_fifo_io_push_ready                   ), //o
    .io_push_payload (readerB_io_data_payload[511:0]                                ), //i
    .io_pop_valid    (toplevel_readerB_io_data_fifo_io_pop_valid                    ), //o
    .io_pop_ready    (toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_ready), //i
    .io_pop_payload  (toplevel_readerB_io_data_fifo_io_pop_payload[511:0]           ), //o
    .io_flush        (toplevel_readerB_io_data_fifo_io_flush                        ), //i
    .io_occupancy    (toplevel_readerB_io_data_fifo_io_occupancy[6:0]               ), //o
    .io_availability (toplevel_readerB_io_data_fifo_io_availability[6:0]            ), //o
    .clk             (clk                                                           ), //i
    .reset           (reset                                                         )  //i
  );
  StreamFifo_2 toplevel_cciRegisters_io_memoryRegions_toStream_fifo (
    .io_push_valid             (toplevel_cciRegisters_io_memoryRegions_toStream_valid                              ), //i
    .io_push_ready             (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_push_ready                 ), //o
    .io_push_payload_0_mrIndex (toplevel_cciRegisters_io_memoryRegions_toStream_payload_0_mrIndex[7:0]             ), //i
    .io_push_payload_0_address (toplevel_cciRegisters_io_memoryRegions_toStream_payload_0_address[55:0]            ), //i
    .io_push_payload_0_length  (toplevel_cciRegisters_io_memoryRegions_toStream_payload_0_length[31:0]             ), //i
    .io_push_payload_1_mrIndex (toplevel_cciRegisters_io_memoryRegions_toStream_payload_1_mrIndex[7:0]             ), //i
    .io_push_payload_1_address (toplevel_cciRegisters_io_memoryRegions_toStream_payload_1_address[55:0]            ), //i
    .io_push_payload_1_length  (toplevel_cciRegisters_io_memoryRegions_toStream_payload_1_length[31:0]             ), //i
    .io_push_payload_2_mrIndex (toplevel_cciRegisters_io_memoryRegions_toStream_payload_2_mrIndex[7:0]             ), //i
    .io_push_payload_2_address (toplevel_cciRegisters_io_memoryRegions_toStream_payload_2_address[55:0]            ), //i
    .io_push_payload_2_length  (toplevel_cciRegisters_io_memoryRegions_toStream_payload_2_length[31:0]             ), //i
    .io_pop_valid              (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_valid                  ), //o
    .io_pop_ready              (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_ready                  ), //i
    .io_pop_payload_0_mrIndex  (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_0_mrIndex[7:0] ), //o
    .io_pop_payload_0_address  (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_0_address[55:0]), //o
    .io_pop_payload_0_length   (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_0_length[31:0] ), //o
    .io_pop_payload_1_mrIndex  (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_1_mrIndex[7:0] ), //o
    .io_pop_payload_1_address  (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_1_address[55:0]), //o
    .io_pop_payload_1_length   (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_1_length[31:0] ), //o
    .io_pop_payload_2_mrIndex  (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_mrIndex[7:0] ), //o
    .io_pop_payload_2_address  (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_address[55:0]), //o
    .io_pop_payload_2_length   (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_length[31:0] ), //o
    .io_flush                  (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_flush                      ), //i
    .io_occupancy              (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_occupancy[1:0]             ), //o
    .io_availability           (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_availability[1:0]          ), //o
    .clk                       (clk                                                                                ), //i
    .reset                     (reset                                                                              )  //i
  );
  StreamFifo_3 done_toStream_fifo (
    .io_push_valid   (done_toStream_valid                    ), //i
    .io_push_ready   (done_toStream_fifo_io_push_ready       ), //o
    .io_pop_valid    (done_toStream_fifo_io_pop_valid        ), //o
    .io_pop_ready    (_zz_io_pop_ready_8                     ), //i
    .io_flush        (done_toStream_fifo_io_flush            ), //i
    .io_occupancy    (done_toStream_fifo_io_occupancy[1:0]   ), //o
    .io_availability (done_toStream_fifo_io_availability[1:0]), //o
    .clk             (clk                                    ), //i
    .reset           (reset                                  )  //i
  );
  assign cci_awready = cciRegisters_io_cci_aw_ready;
  assign cci_wready = cciRegisters_io_cci_w_ready;
  assign cci_bvalid = cciRegisters_io_cci_b_valid;
  assign cci_bresp = cciRegisters_io_cci_b_payload_resp;
  assign cci_arready = cciRegisters_io_cci_ar_ready;
  assign cci_rvalid = cciRegisters_io_cci_r_valid;
  assign cci_rdata = cciRegisters_io_cci_r_payload_data;
  assign cci_rresp = cciRegisters_io_cci_r_payload_resp;
  assign memAxi_arvalid = readArbiter_io_output_ar_valid;
  assign memAxi_araddr = readArbiter_io_output_ar_payload_addr;
  assign memAxi_arid = readArbiter_io_output_ar_payload_id;
  assign memAxi_arlen = readArbiter_io_output_ar_payload_len;
  assign memAxi_arsize = readArbiter_io_output_ar_payload_size;
  assign memAxi_arburst = readArbiter_io_output_ar_payload_burst;
  assign memAxi_arprot = readArbiter_io_output_ar_payload_prot;
  assign memAxi_rready = readArbiter_io_output_r_ready;
  assign memAxi_awvalid = writerC_io_bus_aw_valid;
  assign memAxi_awaddr = writerC_io_bus_aw_payload_addr;
  assign memAxi_awid = writerC_io_bus_aw_payload_id;
  assign memAxi_awlen = writerC_io_bus_aw_payload_len;
  assign memAxi_awsize = writerC_io_bus_aw_payload_size;
  assign memAxi_awburst = writerC_io_bus_aw_payload_burst;
  assign memAxi_awprot = writerC_io_bus_aw_payload_prot;
  assign memAxi_wvalid = writerC_io_bus_w_valid;
  assign memAxi_wdata = writerC_io_bus_w_payload_data;
  assign memAxi_wstrb = writerC_io_bus_w_payload_strb;
  assign memAxi_wlast = writerC_io_bus_w_payload_last;
  assign memAxi_bready = writerC_io_bus_b_ready;
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_valid = toplevel_readerA_io_data_fifo_io_pop_valid;
  assign _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0 = toplevel_readerA_io_data_fifo_io_pop_payload;
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[31 : 0];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_1 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[63 : 32];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_2 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[95 : 64];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_3 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[127 : 96];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_4 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[159 : 128];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_5 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[191 : 160];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_6 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[223 : 192];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_7 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[255 : 224];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_8 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[287 : 256];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_9 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[319 : 288];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_10 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[351 : 320];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_11 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[383 : 352];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_12 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[415 : 384];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_13 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[447 : 416];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_14 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[479 : 448];
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_15 = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_payload_0[511 : 480];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_valid = toplevel_readerB_io_data_fifo_io_pop_valid;
  assign _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0 = toplevel_readerB_io_data_fifo_io_pop_payload;
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[31 : 0];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_1 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[63 : 32];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_2 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[95 : 64];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_3 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[127 : 96];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_4 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[159 : 128];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_5 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[191 : 160];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_6 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[223 : 192];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_7 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[255 : 224];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_8 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[287 : 256];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_9 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[319 : 288];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_10 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[351 : 320];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_11 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[383 : 352];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_12 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[415 : 384];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_13 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[447 : 416];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_14 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[479 : 448];
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_15 = _zz_toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_payload_0[511 : 480];
  assign _zz_addedData_valid = (toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_valid && toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_valid);
  assign _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_ready = (_zz_addedData_valid && addedData_ready);
  assign toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_ready = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_ready;
  assign toplevel_toplevel_readerB_io_data_fifo_io_pop_transmuted_ready = _zz_toplevel_toplevel_readerA_io_data_fifo_io_pop_transmuted_ready;
  assign addedData_valid = _zz_addedData_valid;
  assign addedData_payload_data = {_zz_addedData_payload_data,{_zz_addedData_payload_data_1,{_zz_addedData_payload_data_2,{_zz_addedData_payload_data_3,{_zz_addedData_payload_data_4,{_zz_addedData_payload_data_5,{_zz_addedData_payload_data_6,{_zz_addedData_payload_data_7,{_zz_addedData_payload_data_8,{_zz_addedData_payload_data_9,{_zz_addedData_payload_data_10,{_zz_addedData_payload_data_11,{_zz_addedData_payload_data_12,{_zz_addedData_payload_data_13,{_zz_addedData_payload_data_14,_zz_addedData_payload_data_15}}}}}}}}}}}}}}};
  assign addedData_payload_strb = 64'hffffffffffffffff;
  always @(*) begin
    addedData_ready = addedData_m2sPipe_ready;
    if(when_Stream_l369) begin
      addedData_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! addedData_m2sPipe_valid);
  assign addedData_m2sPipe_valid = addedData_rValid;
  assign addedData_m2sPipe_payload_data = addedData_rData_data;
  assign addedData_m2sPipe_payload_strb = addedData_rData_strb;
  assign addedData_m2sPipe_ready = writerC_io_data_ready;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_valid = cciRegisters_io_memoryRegions_valid;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_payload_0_mrIndex = cciRegisters_io_memoryRegions_payload_0_mrIndex;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_payload_0_address = cciRegisters_io_memoryRegions_payload_0_address;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_payload_0_length = cciRegisters_io_memoryRegions_payload_0_length;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_payload_1_mrIndex = cciRegisters_io_memoryRegions_payload_1_mrIndex;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_payload_1_address = cciRegisters_io_memoryRegions_payload_1_address;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_payload_1_length = cciRegisters_io_memoryRegions_payload_1_length;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_payload_2_mrIndex = cciRegisters_io_memoryRegions_payload_2_mrIndex;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_payload_2_address = cciRegisters_io_memoryRegions_payload_2_address;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_payload_2_length = cciRegisters_io_memoryRegions_payload_2_length;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_ready = toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_push_ready;
  assign _zz_io_cmd_valid = (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_valid && _zz_io_pop_ready_1);
  assign _zz_io_pop_ready = readerA_io_cmd_ready;
  assign readerA_io_cmd_payload_baseAddr = toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_0_address[33:0];
  assign readerA_io_cmd_payload_burstLen = {2'd0, _zz_io_cmd_payload_burstLen};
  assign _zz_io_cmd_valid_1 = (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_valid && _zz_io_pop_ready_3);
  assign _zz_io_pop_ready_2 = readerB_io_cmd_ready;
  assign readerB_io_cmd_payload_baseAddr = toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_1_address[33:0];
  assign readerB_io_cmd_payload_burstLen = {2'd0, _zz_io_cmd_payload_burstLen_1};
  assign _zz_io_cmd_valid_2 = (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_valid && _zz_io_pop_ready_5);
  assign _zz_io_pop_ready_4 = writerC_io_cmd_ready;
  assign writerC_io_cmd_payload_baseAddr = toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_address[33:0];
  assign writerC_io_cmd_payload_burstLen = {2'd0, _zz_io_cmd_payload_burstLen_2};
  assign done_valid = writerC_io_cmdDone;
  assign _zz_io_transfer_valid = (toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_valid && _zz_io_pop_ready_7);
  assign toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_ready = ((((_zz_io_pop_ready || (! _zz_io_pop_ready_1)) && (_zz_io_pop_ready_2 || (! _zz_io_pop_ready_3))) && (_zz_io_pop_ready_4 || (! _zz_io_pop_ready_5))) && (_zz_io_pop_ready_6 || (! _zz_io_pop_ready_7)));
  assign done_toStream_valid = done_valid;
  assign done_toStream_ready = done_toStream_fifo_io_push_ready;
  assign _zz_io_transfer_valid_1 = (_zz_io_transfer_valid && done_toStream_fifo_io_pop_valid);
  assign _zz_io_pop_ready_8 = (_zz_io_transfer_valid_1 && io_transfer_ready);
  assign _zz_io_pop_ready_6 = _zz_io_pop_ready_8;
  assign io_transfer_valid = _zz_io_transfer_valid_1;
  assign io_transfer_payload_mrIndex = toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_mrIndex;
  assign io_transfer_payload_address = toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_address;
  assign io_transfer_payload_length = toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_payload_2_length;
  assign toplevel_readerA_io_data_fifo_io_flush = 1'b0;
  assign toplevel_readerB_io_data_fifo_io_flush = 1'b0;
  assign toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_flush = 1'b0;
  assign done_toStream_fifo_io_flush = 1'b0;
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      addedData_rValid <= 1'b0;
      _zz_io_pop_ready_1 <= 1'b1;
      _zz_io_pop_ready_3 <= 1'b1;
      _zz_io_pop_ready_5 <= 1'b1;
      _zz_io_pop_ready_7 <= 1'b1;
    end else begin
      if(addedData_ready) begin
        addedData_rValid <= addedData_valid;
      end
      if((_zz_io_cmd_valid && _zz_io_pop_ready)) begin
        _zz_io_pop_ready_1 <= 1'b0;
      end
      if(toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_ready) begin
        _zz_io_pop_ready_1 <= 1'b1;
      end
      if((_zz_io_cmd_valid_1 && _zz_io_pop_ready_2)) begin
        _zz_io_pop_ready_3 <= 1'b0;
      end
      if(toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_ready) begin
        _zz_io_pop_ready_3 <= 1'b1;
      end
      if((_zz_io_cmd_valid_2 && _zz_io_pop_ready_4)) begin
        _zz_io_pop_ready_5 <= 1'b0;
      end
      if(toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_ready) begin
        _zz_io_pop_ready_5 <= 1'b1;
      end
      if((_zz_io_transfer_valid && _zz_io_pop_ready_6)) begin
        _zz_io_pop_ready_7 <= 1'b0;
      end
      if(toplevel_cciRegisters_io_memoryRegions_toStream_fifo_io_pop_ready) begin
        _zz_io_pop_ready_7 <= 1'b1;
      end
    end
  end

  always @(posedge clk) begin
    if(addedData_ready) begin
      addedData_rData_data <= addedData_payload_data;
      addedData_rData_strb <= addedData_payload_strb;
    end
  end


endmodule

module StreamFifo_3 (
  input  wire          io_push_valid,
  output wire          io_push_ready,
  output wire          io_pop_valid,
  input  wire          io_pop_ready,
  input  wire          io_flush,
  output wire [1:0]    io_occupancy,
  output wire [1:0]    io_availability,
  input  wire          clk,
  input  wire          reset
);

  wire                logic_ptr_doPush;
  wire                logic_ptr_doPop;
  wire                logic_ptr_full;
  wire                logic_ptr_empty;
  reg        [1:0]    logic_ptr_push;
  reg        [1:0]    logic_ptr_pop;
  wire       [1:0]    logic_ptr_occupancy;
  wire       [1:0]    logic_ptr_popOnIo;
  wire                when_Stream_l1205;
  reg                 logic_ptr_wentUp;
  wire                io_push_fire;
  wire                logic_push_onRam_write_valid;
  wire       [0:0]    logic_push_onRam_write_payload_address;
  wire                logic_pop_addressGen_valid;
  reg                 logic_pop_addressGen_ready;
  wire       [0:0]    logic_pop_addressGen_payload;
  wire                logic_pop_addressGen_fire;
  wire                logic_pop_sync_readArbitation_valid;
  wire                logic_pop_sync_readArbitation_ready;
  wire       [0:0]    logic_pop_sync_readArbitation_payload;
  reg                 logic_pop_addressGen_rValid;
  reg        [0:0]    logic_pop_addressGen_rData;
  wire                when_Stream_l369;
  wire                logic_pop_sync_readPort_cmd_valid;
  wire       [0:0]    logic_pop_sync_readPort_cmd_payload;
  wire                logic_pop_sync_readArbitation_translated_valid;
  wire                logic_pop_sync_readArbitation_translated_ready;
  wire                logic_pop_sync_readArbitation_fire;
  reg        [1:0]    logic_pop_sync_popReg;

  assign when_Stream_l1205 = (logic_ptr_doPush != logic_ptr_doPop);
  assign logic_ptr_full = (((logic_ptr_push ^ logic_ptr_popOnIo) ^ 2'b10) == 2'b00);
  assign logic_ptr_empty = (logic_ptr_push == logic_ptr_pop);
  assign logic_ptr_occupancy = (logic_ptr_push - logic_ptr_popOnIo);
  assign io_push_ready = (! logic_ptr_full);
  assign io_push_fire = (io_push_valid && io_push_ready);
  assign logic_ptr_doPush = io_push_fire;
  assign logic_push_onRam_write_valid = io_push_fire;
  assign logic_push_onRam_write_payload_address = logic_ptr_push[0:0];
  assign logic_pop_addressGen_valid = (! logic_ptr_empty);
  assign logic_pop_addressGen_payload = logic_ptr_pop[0:0];
  assign logic_pop_addressGen_fire = (logic_pop_addressGen_valid && logic_pop_addressGen_ready);
  assign logic_ptr_doPop = logic_pop_addressGen_fire;
  always @(*) begin
    logic_pop_addressGen_ready = logic_pop_sync_readArbitation_ready;
    if(when_Stream_l369) begin
      logic_pop_addressGen_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! logic_pop_sync_readArbitation_valid);
  assign logic_pop_sync_readArbitation_valid = logic_pop_addressGen_rValid;
  assign logic_pop_sync_readArbitation_payload = logic_pop_addressGen_rData;
  assign logic_pop_sync_readPort_cmd_valid = logic_pop_addressGen_fire;
  assign logic_pop_sync_readPort_cmd_payload = logic_pop_addressGen_payload;
  assign logic_pop_sync_readArbitation_translated_valid = logic_pop_sync_readArbitation_valid;
  assign logic_pop_sync_readArbitation_ready = logic_pop_sync_readArbitation_translated_ready;
  assign io_pop_valid = logic_pop_sync_readArbitation_translated_valid;
  assign logic_pop_sync_readArbitation_translated_ready = io_pop_ready;
  assign logic_pop_sync_readArbitation_fire = (logic_pop_sync_readArbitation_valid && logic_pop_sync_readArbitation_ready);
  assign logic_ptr_popOnIo = logic_pop_sync_popReg;
  assign io_occupancy = logic_ptr_occupancy;
  assign io_availability = (2'b10 - logic_ptr_occupancy);
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      logic_ptr_push <= 2'b00;
      logic_ptr_pop <= 2'b00;
      logic_ptr_wentUp <= 1'b0;
      logic_pop_addressGen_rValid <= 1'b0;
      logic_pop_sync_popReg <= 2'b00;
    end else begin
      if(when_Stream_l1205) begin
        logic_ptr_wentUp <= logic_ptr_doPush;
      end
      if(io_flush) begin
        logic_ptr_wentUp <= 1'b0;
      end
      if(logic_ptr_doPush) begin
        logic_ptr_push <= (logic_ptr_push + 2'b01);
      end
      if(logic_ptr_doPop) begin
        logic_ptr_pop <= (logic_ptr_pop + 2'b01);
      end
      if(io_flush) begin
        logic_ptr_push <= 2'b00;
        logic_ptr_pop <= 2'b00;
      end
      if(logic_pop_addressGen_ready) begin
        logic_pop_addressGen_rValid <= logic_pop_addressGen_valid;
      end
      if(io_flush) begin
        logic_pop_addressGen_rValid <= 1'b0;
      end
      if(logic_pop_sync_readArbitation_fire) begin
        logic_pop_sync_popReg <= logic_ptr_pop;
      end
      if(io_flush) begin
        logic_pop_sync_popReg <= 2'b00;
      end
    end
  end

  always @(posedge clk) begin
    if(logic_pop_addressGen_ready) begin
      logic_pop_addressGen_rData <= logic_pop_addressGen_payload;
    end
  end


endmodule

module StreamFifo_2 (
  input  wire          io_push_valid,
  output wire          io_push_ready,
  input  wire [7:0]    io_push_payload_0_mrIndex,
  input  wire [55:0]   io_push_payload_0_address,
  input  wire [31:0]   io_push_payload_0_length,
  input  wire [7:0]    io_push_payload_1_mrIndex,
  input  wire [55:0]   io_push_payload_1_address,
  input  wire [31:0]   io_push_payload_1_length,
  input  wire [7:0]    io_push_payload_2_mrIndex,
  input  wire [55:0]   io_push_payload_2_address,
  input  wire [31:0]   io_push_payload_2_length,
  output wire          io_pop_valid,
  input  wire          io_pop_ready,
  output wire [7:0]    io_pop_payload_0_mrIndex,
  output wire [55:0]   io_pop_payload_0_address,
  output wire [31:0]   io_pop_payload_0_length,
  output wire [7:0]    io_pop_payload_1_mrIndex,
  output wire [55:0]   io_pop_payload_1_address,
  output wire [31:0]   io_pop_payload_1_length,
  output wire [7:0]    io_pop_payload_2_mrIndex,
  output wire [55:0]   io_pop_payload_2_address,
  output wire [31:0]   io_pop_payload_2_length,
  input  wire          io_flush,
  output wire [1:0]    io_occupancy,
  output wire [1:0]    io_availability,
  input  wire          clk,
  input  wire          reset
);

  reg        [287:0]  _zz_logic_ram_port1;
  wire       [287:0]  _zz_logic_ram_port;
  reg                 _zz_1;
  wire                logic_ptr_doPush;
  wire                logic_ptr_doPop;
  wire                logic_ptr_full;
  wire                logic_ptr_empty;
  reg        [1:0]    logic_ptr_push;
  reg        [1:0]    logic_ptr_pop;
  wire       [1:0]    logic_ptr_occupancy;
  wire       [1:0]    logic_ptr_popOnIo;
  wire                when_Stream_l1205;
  reg                 logic_ptr_wentUp;
  wire                io_push_fire;
  wire                logic_push_onRam_write_valid;
  wire       [0:0]    logic_push_onRam_write_payload_address;
  wire       [7:0]    logic_push_onRam_write_payload_data_0_mrIndex;
  wire       [55:0]   logic_push_onRam_write_payload_data_0_address;
  wire       [31:0]   logic_push_onRam_write_payload_data_0_length;
  wire       [7:0]    logic_push_onRam_write_payload_data_1_mrIndex;
  wire       [55:0]   logic_push_onRam_write_payload_data_1_address;
  wire       [31:0]   logic_push_onRam_write_payload_data_1_length;
  wire       [7:0]    logic_push_onRam_write_payload_data_2_mrIndex;
  wire       [55:0]   logic_push_onRam_write_payload_data_2_address;
  wire       [31:0]   logic_push_onRam_write_payload_data_2_length;
  wire                logic_pop_addressGen_valid;
  reg                 logic_pop_addressGen_ready;
  wire       [0:0]    logic_pop_addressGen_payload;
  wire                logic_pop_addressGen_fire;
  wire                logic_pop_sync_readArbitation_valid;
  wire                logic_pop_sync_readArbitation_ready;
  wire       [0:0]    logic_pop_sync_readArbitation_payload;
  reg                 logic_pop_addressGen_rValid;
  reg        [0:0]    logic_pop_addressGen_rData;
  wire                when_Stream_l369;
  wire                logic_pop_sync_readPort_cmd_valid;
  wire       [0:0]    logic_pop_sync_readPort_cmd_payload;
  wire       [7:0]    logic_pop_sync_readPort_rsp_0_mrIndex;
  wire       [55:0]   logic_pop_sync_readPort_rsp_0_address;
  wire       [31:0]   logic_pop_sync_readPort_rsp_0_length;
  wire       [7:0]    logic_pop_sync_readPort_rsp_1_mrIndex;
  wire       [55:0]   logic_pop_sync_readPort_rsp_1_address;
  wire       [31:0]   logic_pop_sync_readPort_rsp_1_length;
  wire       [7:0]    logic_pop_sync_readPort_rsp_2_mrIndex;
  wire       [55:0]   logic_pop_sync_readPort_rsp_2_address;
  wire       [31:0]   logic_pop_sync_readPort_rsp_2_length;
  wire       [287:0]  _zz_logic_pop_sync_readPort_rsp_0_mrIndex;
  wire       [95:0]   _zz_logic_pop_sync_readPort_rsp_0_mrIndex_1;
  wire       [95:0]   _zz_logic_pop_sync_readPort_rsp_1_mrIndex;
  wire       [95:0]   _zz_logic_pop_sync_readPort_rsp_2_mrIndex;
  wire                logic_pop_sync_readArbitation_translated_valid;
  wire                logic_pop_sync_readArbitation_translated_ready;
  wire       [7:0]    logic_pop_sync_readArbitation_translated_payload_0_mrIndex;
  wire       [55:0]   logic_pop_sync_readArbitation_translated_payload_0_address;
  wire       [31:0]   logic_pop_sync_readArbitation_translated_payload_0_length;
  wire       [7:0]    logic_pop_sync_readArbitation_translated_payload_1_mrIndex;
  wire       [55:0]   logic_pop_sync_readArbitation_translated_payload_1_address;
  wire       [31:0]   logic_pop_sync_readArbitation_translated_payload_1_length;
  wire       [7:0]    logic_pop_sync_readArbitation_translated_payload_2_mrIndex;
  wire       [55:0]   logic_pop_sync_readArbitation_translated_payload_2_address;
  wire       [31:0]   logic_pop_sync_readArbitation_translated_payload_2_length;
  wire                logic_pop_sync_readArbitation_fire;
  reg        [1:0]    logic_pop_sync_popReg;
  reg [287:0] logic_ram [0:1];

  assign _zz_logic_ram_port = {{logic_push_onRam_write_payload_data_2_length,{logic_push_onRam_write_payload_data_2_address,logic_push_onRam_write_payload_data_2_mrIndex}},{{logic_push_onRam_write_payload_data_1_length,{logic_push_onRam_write_payload_data_1_address,logic_push_onRam_write_payload_data_1_mrIndex}},{logic_push_onRam_write_payload_data_0_length,{logic_push_onRam_write_payload_data_0_address,logic_push_onRam_write_payload_data_0_mrIndex}}}};
  always @(posedge clk) begin
    if(_zz_1) begin
      logic_ram[logic_push_onRam_write_payload_address] <= _zz_logic_ram_port;
    end
  end

  always @(posedge clk) begin
    if(logic_pop_sync_readPort_cmd_valid) begin
      _zz_logic_ram_port1 <= logic_ram[logic_pop_sync_readPort_cmd_payload];
    end
  end

  always @(*) begin
    _zz_1 = 1'b0;
    if(logic_push_onRam_write_valid) begin
      _zz_1 = 1'b1;
    end
  end

  assign when_Stream_l1205 = (logic_ptr_doPush != logic_ptr_doPop);
  assign logic_ptr_full = (((logic_ptr_push ^ logic_ptr_popOnIo) ^ 2'b10) == 2'b00);
  assign logic_ptr_empty = (logic_ptr_push == logic_ptr_pop);
  assign logic_ptr_occupancy = (logic_ptr_push - logic_ptr_popOnIo);
  assign io_push_ready = (! logic_ptr_full);
  assign io_push_fire = (io_push_valid && io_push_ready);
  assign logic_ptr_doPush = io_push_fire;
  assign logic_push_onRam_write_valid = io_push_fire;
  assign logic_push_onRam_write_payload_address = logic_ptr_push[0:0];
  assign logic_push_onRam_write_payload_data_0_mrIndex = io_push_payload_0_mrIndex;
  assign logic_push_onRam_write_payload_data_0_address = io_push_payload_0_address;
  assign logic_push_onRam_write_payload_data_0_length = io_push_payload_0_length;
  assign logic_push_onRam_write_payload_data_1_mrIndex = io_push_payload_1_mrIndex;
  assign logic_push_onRam_write_payload_data_1_address = io_push_payload_1_address;
  assign logic_push_onRam_write_payload_data_1_length = io_push_payload_1_length;
  assign logic_push_onRam_write_payload_data_2_mrIndex = io_push_payload_2_mrIndex;
  assign logic_push_onRam_write_payload_data_2_address = io_push_payload_2_address;
  assign logic_push_onRam_write_payload_data_2_length = io_push_payload_2_length;
  assign logic_pop_addressGen_valid = (! logic_ptr_empty);
  assign logic_pop_addressGen_payload = logic_ptr_pop[0:0];
  assign logic_pop_addressGen_fire = (logic_pop_addressGen_valid && logic_pop_addressGen_ready);
  assign logic_ptr_doPop = logic_pop_addressGen_fire;
  always @(*) begin
    logic_pop_addressGen_ready = logic_pop_sync_readArbitation_ready;
    if(when_Stream_l369) begin
      logic_pop_addressGen_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! logic_pop_sync_readArbitation_valid);
  assign logic_pop_sync_readArbitation_valid = logic_pop_addressGen_rValid;
  assign logic_pop_sync_readArbitation_payload = logic_pop_addressGen_rData;
  assign _zz_logic_pop_sync_readPort_rsp_0_mrIndex = _zz_logic_ram_port1;
  assign _zz_logic_pop_sync_readPort_rsp_0_mrIndex_1 = _zz_logic_pop_sync_readPort_rsp_0_mrIndex[95 : 0];
  assign _zz_logic_pop_sync_readPort_rsp_1_mrIndex = _zz_logic_pop_sync_readPort_rsp_0_mrIndex[191 : 96];
  assign _zz_logic_pop_sync_readPort_rsp_2_mrIndex = _zz_logic_pop_sync_readPort_rsp_0_mrIndex[287 : 192];
  assign logic_pop_sync_readPort_rsp_0_mrIndex = _zz_logic_pop_sync_readPort_rsp_0_mrIndex_1[7 : 0];
  assign logic_pop_sync_readPort_rsp_0_address = _zz_logic_pop_sync_readPort_rsp_0_mrIndex_1[63 : 8];
  assign logic_pop_sync_readPort_rsp_0_length = _zz_logic_pop_sync_readPort_rsp_0_mrIndex_1[95 : 64];
  assign logic_pop_sync_readPort_rsp_1_mrIndex = _zz_logic_pop_sync_readPort_rsp_1_mrIndex[7 : 0];
  assign logic_pop_sync_readPort_rsp_1_address = _zz_logic_pop_sync_readPort_rsp_1_mrIndex[63 : 8];
  assign logic_pop_sync_readPort_rsp_1_length = _zz_logic_pop_sync_readPort_rsp_1_mrIndex[95 : 64];
  assign logic_pop_sync_readPort_rsp_2_mrIndex = _zz_logic_pop_sync_readPort_rsp_2_mrIndex[7 : 0];
  assign logic_pop_sync_readPort_rsp_2_address = _zz_logic_pop_sync_readPort_rsp_2_mrIndex[63 : 8];
  assign logic_pop_sync_readPort_rsp_2_length = _zz_logic_pop_sync_readPort_rsp_2_mrIndex[95 : 64];
  assign logic_pop_sync_readPort_cmd_valid = logic_pop_addressGen_fire;
  assign logic_pop_sync_readPort_cmd_payload = logic_pop_addressGen_payload;
  assign logic_pop_sync_readArbitation_translated_valid = logic_pop_sync_readArbitation_valid;
  assign logic_pop_sync_readArbitation_ready = logic_pop_sync_readArbitation_translated_ready;
  assign logic_pop_sync_readArbitation_translated_payload_0_mrIndex = logic_pop_sync_readPort_rsp_0_mrIndex;
  assign logic_pop_sync_readArbitation_translated_payload_0_address = logic_pop_sync_readPort_rsp_0_address;
  assign logic_pop_sync_readArbitation_translated_payload_0_length = logic_pop_sync_readPort_rsp_0_length;
  assign logic_pop_sync_readArbitation_translated_payload_1_mrIndex = logic_pop_sync_readPort_rsp_1_mrIndex;
  assign logic_pop_sync_readArbitation_translated_payload_1_address = logic_pop_sync_readPort_rsp_1_address;
  assign logic_pop_sync_readArbitation_translated_payload_1_length = logic_pop_sync_readPort_rsp_1_length;
  assign logic_pop_sync_readArbitation_translated_payload_2_mrIndex = logic_pop_sync_readPort_rsp_2_mrIndex;
  assign logic_pop_sync_readArbitation_translated_payload_2_address = logic_pop_sync_readPort_rsp_2_address;
  assign logic_pop_sync_readArbitation_translated_payload_2_length = logic_pop_sync_readPort_rsp_2_length;
  assign io_pop_valid = logic_pop_sync_readArbitation_translated_valid;
  assign logic_pop_sync_readArbitation_translated_ready = io_pop_ready;
  assign io_pop_payload_0_mrIndex = logic_pop_sync_readArbitation_translated_payload_0_mrIndex;
  assign io_pop_payload_0_address = logic_pop_sync_readArbitation_translated_payload_0_address;
  assign io_pop_payload_0_length = logic_pop_sync_readArbitation_translated_payload_0_length;
  assign io_pop_payload_1_mrIndex = logic_pop_sync_readArbitation_translated_payload_1_mrIndex;
  assign io_pop_payload_1_address = logic_pop_sync_readArbitation_translated_payload_1_address;
  assign io_pop_payload_1_length = logic_pop_sync_readArbitation_translated_payload_1_length;
  assign io_pop_payload_2_mrIndex = logic_pop_sync_readArbitation_translated_payload_2_mrIndex;
  assign io_pop_payload_2_address = logic_pop_sync_readArbitation_translated_payload_2_address;
  assign io_pop_payload_2_length = logic_pop_sync_readArbitation_translated_payload_2_length;
  assign logic_pop_sync_readArbitation_fire = (logic_pop_sync_readArbitation_valid && logic_pop_sync_readArbitation_ready);
  assign logic_ptr_popOnIo = logic_pop_sync_popReg;
  assign io_occupancy = logic_ptr_occupancy;
  assign io_availability = (2'b10 - logic_ptr_occupancy);
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      logic_ptr_push <= 2'b00;
      logic_ptr_pop <= 2'b00;
      logic_ptr_wentUp <= 1'b0;
      logic_pop_addressGen_rValid <= 1'b0;
      logic_pop_sync_popReg <= 2'b00;
    end else begin
      if(when_Stream_l1205) begin
        logic_ptr_wentUp <= logic_ptr_doPush;
      end
      if(io_flush) begin
        logic_ptr_wentUp <= 1'b0;
      end
      if(logic_ptr_doPush) begin
        logic_ptr_push <= (logic_ptr_push + 2'b01);
      end
      if(logic_ptr_doPop) begin
        logic_ptr_pop <= (logic_ptr_pop + 2'b01);
      end
      if(io_flush) begin
        logic_ptr_push <= 2'b00;
        logic_ptr_pop <= 2'b00;
      end
      if(logic_pop_addressGen_ready) begin
        logic_pop_addressGen_rValid <= logic_pop_addressGen_valid;
      end
      if(io_flush) begin
        logic_pop_addressGen_rValid <= 1'b0;
      end
      if(logic_pop_sync_readArbitation_fire) begin
        logic_pop_sync_popReg <= logic_ptr_pop;
      end
      if(io_flush) begin
        logic_pop_sync_popReg <= 2'b00;
      end
    end
  end

  always @(posedge clk) begin
    if(logic_pop_addressGen_ready) begin
      logic_pop_addressGen_rData <= logic_pop_addressGen_payload;
    end
  end


endmodule

//StreamFifo_1 replaced by StreamFifo_9

//StreamFifo replaced by StreamFifo_9

module Axi4ReadOnlyArbiter (
  input  wire          io_inputs_0_ar_valid,
  output wire          io_inputs_0_ar_ready,
  input  wire [33:0]   io_inputs_0_ar_payload_addr,
  input  wire [0:0]    io_inputs_0_ar_payload_id,
  input  wire [7:0]    io_inputs_0_ar_payload_len,
  input  wire [2:0]    io_inputs_0_ar_payload_size,
  input  wire [1:0]    io_inputs_0_ar_payload_burst,
  input  wire [2:0]    io_inputs_0_ar_payload_prot,
  output wire          io_inputs_0_r_valid,
  input  wire          io_inputs_0_r_ready,
  output wire [511:0]  io_inputs_0_r_payload_data,
  output wire [0:0]    io_inputs_0_r_payload_id,
  output wire [1:0]    io_inputs_0_r_payload_resp,
  output wire          io_inputs_0_r_payload_last,
  input  wire          io_inputs_1_ar_valid,
  output wire          io_inputs_1_ar_ready,
  input  wire [33:0]   io_inputs_1_ar_payload_addr,
  input  wire [0:0]    io_inputs_1_ar_payload_id,
  input  wire [7:0]    io_inputs_1_ar_payload_len,
  input  wire [2:0]    io_inputs_1_ar_payload_size,
  input  wire [1:0]    io_inputs_1_ar_payload_burst,
  input  wire [2:0]    io_inputs_1_ar_payload_prot,
  output wire          io_inputs_1_r_valid,
  input  wire          io_inputs_1_r_ready,
  output wire [511:0]  io_inputs_1_r_payload_data,
  output wire [0:0]    io_inputs_1_r_payload_id,
  output wire [1:0]    io_inputs_1_r_payload_resp,
  output wire          io_inputs_1_r_payload_last,
  output wire          io_output_ar_valid,
  input  wire          io_output_ar_ready,
  output wire [33:0]   io_output_ar_payload_addr,
  output wire [1:0]    io_output_ar_payload_id,
  output wire [7:0]    io_output_ar_payload_len,
  output wire [2:0]    io_output_ar_payload_size,
  output wire [1:0]    io_output_ar_payload_burst,
  output wire [2:0]    io_output_ar_payload_prot,
  input  wire          io_output_r_valid,
  output wire          io_output_r_ready,
  input  wire [511:0]  io_output_r_payload_data,
  input  wire [1:0]    io_output_r_payload_id,
  input  wire [1:0]    io_output_r_payload_resp,
  input  wire          io_output_r_payload_last,
  input  wire          clk,
  input  wire          reset
);

  wire                cmdArbiter_io_inputs_0_ready;
  wire                cmdArbiter_io_inputs_1_ready;
  wire                cmdArbiter_io_output_valid;
  wire       [33:0]   cmdArbiter_io_output_payload_addr;
  wire       [0:0]    cmdArbiter_io_output_payload_id;
  wire       [7:0]    cmdArbiter_io_output_payload_len;
  wire       [2:0]    cmdArbiter_io_output_payload_size;
  wire       [1:0]    cmdArbiter_io_output_payload_burst;
  wire       [2:0]    cmdArbiter_io_output_payload_prot;
  wire       [0:0]    cmdArbiter_io_chosen;
  wire       [1:0]    cmdArbiter_io_chosenOH;
  reg                 _zz_io_output_r_ready;
  wire       [0:0]    readRspIndex;
  wire                readRspSels_0;
  wire                readRspSels_1;

  StreamArbiter cmdArbiter (
    .io_inputs_0_valid         (io_inputs_0_ar_valid                   ), //i
    .io_inputs_0_ready         (cmdArbiter_io_inputs_0_ready           ), //o
    .io_inputs_0_payload_addr  (io_inputs_0_ar_payload_addr[33:0]      ), //i
    .io_inputs_0_payload_id    (io_inputs_0_ar_payload_id              ), //i
    .io_inputs_0_payload_len   (io_inputs_0_ar_payload_len[7:0]        ), //i
    .io_inputs_0_payload_size  (io_inputs_0_ar_payload_size[2:0]       ), //i
    .io_inputs_0_payload_burst (io_inputs_0_ar_payload_burst[1:0]      ), //i
    .io_inputs_0_payload_prot  (io_inputs_0_ar_payload_prot[2:0]       ), //i
    .io_inputs_1_valid         (io_inputs_1_ar_valid                   ), //i
    .io_inputs_1_ready         (cmdArbiter_io_inputs_1_ready           ), //o
    .io_inputs_1_payload_addr  (io_inputs_1_ar_payload_addr[33:0]      ), //i
    .io_inputs_1_payload_id    (io_inputs_1_ar_payload_id              ), //i
    .io_inputs_1_payload_len   (io_inputs_1_ar_payload_len[7:0]        ), //i
    .io_inputs_1_payload_size  (io_inputs_1_ar_payload_size[2:0]       ), //i
    .io_inputs_1_payload_burst (io_inputs_1_ar_payload_burst[1:0]      ), //i
    .io_inputs_1_payload_prot  (io_inputs_1_ar_payload_prot[2:0]       ), //i
    .io_output_valid           (cmdArbiter_io_output_valid             ), //o
    .io_output_ready           (io_output_ar_ready                     ), //i
    .io_output_payload_addr    (cmdArbiter_io_output_payload_addr[33:0]), //o
    .io_output_payload_id      (cmdArbiter_io_output_payload_id        ), //o
    .io_output_payload_len     (cmdArbiter_io_output_payload_len[7:0]  ), //o
    .io_output_payload_size    (cmdArbiter_io_output_payload_size[2:0] ), //o
    .io_output_payload_burst   (cmdArbiter_io_output_payload_burst[1:0]), //o
    .io_output_payload_prot    (cmdArbiter_io_output_payload_prot[2:0] ), //o
    .io_chosen                 (cmdArbiter_io_chosen                   ), //o
    .io_chosenOH               (cmdArbiter_io_chosenOH[1:0]            ), //o
    .clk                       (clk                                    ), //i
    .reset                     (reset                                  )  //i
  );
  always @(*) begin
    case(readRspIndex)
      1'b0 : _zz_io_output_r_ready = io_inputs_0_r_ready;
      default : _zz_io_output_r_ready = io_inputs_1_r_ready;
    endcase
  end

  assign io_inputs_0_ar_ready = cmdArbiter_io_inputs_0_ready;
  assign io_inputs_1_ar_ready = cmdArbiter_io_inputs_1_ready;
  assign io_output_ar_valid = cmdArbiter_io_output_valid;
  assign io_output_ar_payload_addr = cmdArbiter_io_output_payload_addr;
  assign io_output_ar_payload_len = cmdArbiter_io_output_payload_len;
  assign io_output_ar_payload_size = cmdArbiter_io_output_payload_size;
  assign io_output_ar_payload_burst = cmdArbiter_io_output_payload_burst;
  assign io_output_ar_payload_prot = cmdArbiter_io_output_payload_prot;
  assign io_output_ar_payload_id = {cmdArbiter_io_chosen,cmdArbiter_io_output_payload_id};
  assign readRspIndex = io_output_r_payload_id[1 : 1];
  assign readRspSels_0 = (readRspIndex == 1'b0);
  assign readRspSels_1 = (readRspIndex == 1'b1);
  assign io_inputs_0_r_valid = (io_output_r_valid && readRspSels_0);
  assign io_inputs_0_r_payload_data = io_output_r_payload_data;
  assign io_inputs_0_r_payload_resp = io_output_r_payload_resp;
  assign io_inputs_0_r_payload_last = io_output_r_payload_last;
  assign io_inputs_0_r_payload_id = io_output_r_payload_id[0 : 0];
  assign io_inputs_1_r_valid = (io_output_r_valid && readRspSels_1);
  assign io_inputs_1_r_payload_data = io_output_r_payload_data;
  assign io_inputs_1_r_payload_resp = io_output_r_payload_resp;
  assign io_inputs_1_r_payload_last = io_output_r_payload_last;
  assign io_inputs_1_r_payload_id = io_output_r_payload_id[0 : 0];
  assign io_output_r_ready = _zz_io_output_r_ready;

endmodule

module SimpleAxi4WriteDma (
  output wire          io_bus_aw_valid,
  input  wire          io_bus_aw_ready,
  output wire [33:0]   io_bus_aw_payload_addr,
  output wire [1:0]    io_bus_aw_payload_id,
  output wire [7:0]    io_bus_aw_payload_len,
  output wire [2:0]    io_bus_aw_payload_size,
  output wire [1:0]    io_bus_aw_payload_burst,
  output wire [2:0]    io_bus_aw_payload_prot,
  output wire          io_bus_w_valid,
  input  wire          io_bus_w_ready,
  output wire [511:0]  io_bus_w_payload_data,
  output wire [63:0]   io_bus_w_payload_strb,
  output wire          io_bus_w_payload_last,
  input  wire          io_bus_b_valid,
  output wire          io_bus_b_ready,
  input  wire [1:0]    io_bus_b_payload_id,
  input  wire [1:0]    io_bus_b_payload_resp,
  input  wire          io_cmd_valid,
  output wire          io_cmd_ready,
  input  wire [33:0]   io_cmd_payload_baseAddr,
  input  wire [33:0]   io_cmd_payload_burstLen,
  input  wire          io_data_valid,
  output wire          io_data_ready,
  input  wire [511:0]  io_data_payload_data,
  input  wire [63:0]   io_data_payload_strb,
  output wire          io_cmdDone,
  input  wire          clk,
  input  wire          reset,
  input  wire          reset_syncronized
);

  wire                dataQueue_io_push_valid;
  wire                dataQueue_io_push_payload_last;
  reg                 dataQueue_io_pop_ready;
  wire       [33:0]   reqGen_io_input_payload_burstLen;
  wire                reqGen_io_output_ready;
  wire                streamFifo_10_io_pop_ready;
  wire                streamFifo_10_io_flush;
  wire                streamFifo_11_io_pop_ready;
  wire                streamFifo_11_io_flush;
  wire                writerC_reqGen_io_isLast_toStream_fifo_io_flush;
  reg                 requestsOut_ccToggle_io_output_ready;
  wire                dataQueue_io_push_ready;
  wire                dataQueue_io_pop_valid;
  wire                dataQueue_io_pop_payload_last;
  wire       [511:0]  dataQueue_io_pop_payload_fragment_data;
  wire       [63:0]   dataQueue_io_pop_payload_fragment_strb;
  wire       [6:0]    dataQueue_io_pushOccupancy;
  wire       [6:0]    dataQueue_io_popOccupancy;
  wire                reqGen_io_input_ready;
  wire                reqGen_io_output_valid;
  wire       [33:0]   reqGen_io_output_payload_address;
  wire       [7:0]    reqGen_io_output_payload_burstLen;
  wire                reqGen_io_isLast_valid;
  wire                reqGen_io_isLast_payload;
  wire                streamFifo_10_io_push_ready;
  wire                streamFifo_10_io_pop_valid;
  wire       [33:0]   streamFifo_10_io_pop_payload_address;
  wire       [7:0]    streamFifo_10_io_pop_payload_burstLen;
  wire       [2:0]    streamFifo_10_io_occupancy;
  wire       [2:0]    streamFifo_10_io_availability;
  wire                streamFifo_11_io_push_ready;
  wire                streamFifo_11_io_pop_valid;
  wire       [33:0]   streamFifo_11_io_pop_payload_address;
  wire       [7:0]    streamFifo_11_io_pop_payload_burstLen;
  wire       [2:0]    streamFifo_11_io_occupancy;
  wire       [2:0]    streamFifo_11_io_availability;
  wire                io_bus_b_ccToggle_io_input_ready;
  wire                io_bus_b_ccToggle_io_output_valid;
  wire       [1:0]    io_bus_b_ccToggle_io_output_payload_id;
  wire       [1:0]    io_bus_b_ccToggle_io_output_payload_resp;
  wire                writerC_reqGen_io_isLast_toStream_fifo_io_push_ready;
  wire                writerC_reqGen_io_isLast_toStream_fifo_io_pop_valid;
  wire                writerC_reqGen_io_isLast_toStream_fifo_io_pop_payload;
  wire       [9:0]    writerC_reqGen_io_isLast_toStream_fifo_io_occupancy;
  wire       [9:0]    writerC_reqGen_io_isLast_toStream_fifo_io_availability;
  wire                requestsOut_ccToggle_io_input_ready;
  wire                requestsOut_ccToggle_io_output_valid;
  wire       [33:0]   requestsOut_ccToggle_io_output_payload_address;
  wire       [7:0]    requestsOut_ccToggle_io_output_payload_burstLen;
  wire       [8:0]    _zz__zz_io_pop_ready;
  wire       [1:0]    _zz__zz_io_pop_ready_1;
  wire       [8:0]    _zz__zz_io_push_payload_last_1;
  wire       [0:0]    _zz__zz_io_push_payload_last_1_1;
  wire       [8:0]    _zz_io_pop_ready_2;
  wire       [8:0]    _zz_io_push_payload_last_3;
  wire       [8:0]    _zz_io_push_payload_last_4;
  wire       [8:0]    _zz_io_push_payload_last_5;
  wire       [1:0]    _zz_io_push_payload_last_6;
  wire       [0:0]    _zz_burstsPending_summand_2;
  wire       [3:0]    _zz_burstsPending_valueNext;
  reg        [3:0]    burstsPending_summand_2;
  reg        [3:0]    burstsPending_summand_1;
  reg        [3:0]    burstsPending_valueNext;
  reg        [3:0]    burstsPending_summand_0;
  wire                burstsPending_willClear;
  wire                _zz_io_push_valid;
  wire                _zz_io_output_ready;
  reg                 _zz_io_output_ready_1;
  wire                _zz_requestsOut_valid;
  wire                requestsOut_valid;
  wire                requestsOut_ready;
  wire       [33:0]   requestsOut_payload_address;
  wire       [7:0]    requestsOut_payload_burstLen;
  wire                requestsOut_fire;
  wire                _zz_io_push_valid_1;
  wire                _zz_io_output_ready_2;
  reg                 _zz_io_output_ready_3;
  wire       [8:0]    _zz_io_pop_ready;
  reg                 _zz_io_push_payload_last;
  reg                 _zz_1;
  reg        [8:0]    _zz_io_push_payload_last_1;
  reg        [8:0]    _zz_io_push_payload_last_2;
  wire                _zz_io_push_valid_2;
  wire                _zz_io_pop_ready_1;
  wire                writerC_streamFifo_11_io_pop_fire;
  wire                _zz_io_push_valid_3;
  wire                _zz_io_data_ready;
  wire                _zz_io_push_valid_4;
  wire                writerC_dataQueue_io_push_fire;
  wire                when_Axi4Dma_l283;
  wire                writerC_reqGen_io_isLast_toStream_valid;
  wire                writerC_reqGen_io_isLast_toStream_ready;
  wire                writerC_reqGen_io_isLast_toStream_payload;
  wire                _zz_io_cmdDone;
  reg                 _zz_io_output_ready_4;
  wire                _zz_io_output_ready_5;
  wire                when_Stream_l439;
  reg                 _zz_io_cmdDone_1;
  wire                writerC_dataQueue_io_pop_m2sPipe_valid;
  wire                writerC_dataQueue_io_pop_m2sPipe_ready;
  wire                writerC_dataQueue_io_pop_m2sPipe_payload_last;
  wire       [511:0]  writerC_dataQueue_io_pop_m2sPipe_payload_fragment_data;
  wire       [63:0]   writerC_dataQueue_io_pop_m2sPipe_payload_fragment_strb;
  reg                 writerC_dataQueue_io_pop_rValid;
  reg                 writerC_dataQueue_io_pop_rData_last;
  reg        [511:0]  writerC_dataQueue_io_pop_rData_fragment_data;
  reg        [63:0]   writerC_dataQueue_io_pop_rData_fragment_strb;
  wire                when_Stream_l369;
  wire                writerC_requestsOut_ccToggle_io_output_m2sPipe_valid;
  reg                 writerC_requestsOut_ccToggle_io_output_m2sPipe_ready;
  wire       [33:0]   writerC_requestsOut_ccToggle_io_output_m2sPipe_payload_address;
  wire       [7:0]    writerC_requestsOut_ccToggle_io_output_m2sPipe_payload_burstLen;
  reg                 writerC_requestsOut_ccToggle_io_output_rValid;
  reg        [33:0]   writerC_requestsOut_ccToggle_io_output_rData_address;
  reg        [7:0]    writerC_requestsOut_ccToggle_io_output_rData_burstLen;
  wire                when_Stream_l369_1;
  wire                writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_valid;
  wire                writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_ready;
  wire       [33:0]   writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_payload_address;
  wire       [7:0]    writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_payload_burstLen;
  reg                 writerC_requestsOut_ccToggle_io_output_m2sPipe_rValid;
  reg        [33:0]   writerC_requestsOut_ccToggle_io_output_m2sPipe_rData_address;
  reg        [7:0]    writerC_requestsOut_ccToggle_io_output_m2sPipe_rData_burstLen;
  wire                when_Stream_l369_2;

  assign _zz__zz_io_pop_ready_1 = {1'b0,1'b1};
  assign _zz__zz_io_pop_ready = {7'd0, _zz__zz_io_pop_ready_1};
  assign _zz__zz_io_push_payload_last_1_1 = _zz_io_push_payload_last;
  assign _zz__zz_io_push_payload_last_1 = {8'd0, _zz__zz_io_push_payload_last_1_1};
  assign _zz_io_pop_ready_2 = (_zz_io_push_payload_last_2 + 9'h001);
  assign _zz_io_push_payload_last_3 = (_zz_io_push_payload_last_2 + 9'h001);
  assign _zz_io_push_payload_last_4 = ({1'b0,streamFifo_11_io_pop_payload_burstLen} + _zz_io_push_payload_last_5);
  assign _zz_io_push_payload_last_6 = {1'b0,1'b1};
  assign _zz_io_push_payload_last_5 = {7'd0, _zz_io_push_payload_last_6};
  assign _zz_burstsPending_summand_2 = 1'b1;
  assign _zz_burstsPending_valueNext = (burstsPending_summand_0 + burstsPending_summand_1);
  StreamFifoCCIfNecessary dataQueue (
    .io_push_valid                 (dataQueue_io_push_valid                      ), //i
    .io_push_ready                 (dataQueue_io_push_ready                      ), //o
    .io_push_payload_last          (dataQueue_io_push_payload_last               ), //i
    .io_push_payload_fragment_data (io_data_payload_data[511:0]                  ), //i
    .io_push_payload_fragment_strb (io_data_payload_strb[63:0]                   ), //i
    .io_pop_valid                  (dataQueue_io_pop_valid                       ), //o
    .io_pop_ready                  (dataQueue_io_pop_ready                       ), //i
    .io_pop_payload_last           (dataQueue_io_pop_payload_last                ), //o
    .io_pop_payload_fragment_data  (dataQueue_io_pop_payload_fragment_data[511:0]), //o
    .io_pop_payload_fragment_strb  (dataQueue_io_pop_payload_fragment_strb[63:0] ), //o
    .io_pushOccupancy              (dataQueue_io_pushOccupancy[6:0]              ), //o
    .io_popOccupancy               (dataQueue_io_popOccupancy[6:0]               ), //o
    .clk                           (clk                                          ), //i
    .reset                         (reset                                        )  //i
  );
  MemRequestSlicer_2 reqGen (
    .io_input_valid             (io_cmd_valid                          ), //i
    .io_input_ready             (reqGen_io_input_ready                 ), //o
    .io_input_payload_address   (io_cmd_payload_baseAddr[33:0]         ), //i
    .io_input_payload_burstLen  (reqGen_io_input_payload_burstLen[33:0]), //i
    .io_output_valid            (reqGen_io_output_valid                ), //o
    .io_output_ready            (reqGen_io_output_ready                ), //i
    .io_output_payload_address  (reqGen_io_output_payload_address[33:0]), //o
    .io_output_payload_burstLen (reqGen_io_output_payload_burstLen[7:0]), //o
    .io_isLast_valid            (reqGen_io_isLast_valid                ), //o
    .io_isLast_payload          (reqGen_io_isLast_payload              ), //o
    .clk                        (clk                                   ), //i
    .reset                      (reset                                 )  //i
  );
  StreamFifo_4 streamFifo_10 (
    .io_push_valid            (_zz_io_push_valid                         ), //i
    .io_push_ready            (streamFifo_10_io_push_ready               ), //o
    .io_push_payload_address  (reqGen_io_output_payload_address[33:0]    ), //i
    .io_push_payload_burstLen (reqGen_io_output_payload_burstLen[7:0]    ), //i
    .io_pop_valid             (streamFifo_10_io_pop_valid                ), //o
    .io_pop_ready             (streamFifo_10_io_pop_ready                ), //i
    .io_pop_payload_address   (streamFifo_10_io_pop_payload_address[33:0]), //o
    .io_pop_payload_burstLen  (streamFifo_10_io_pop_payload_burstLen[7:0]), //o
    .io_flush                 (streamFifo_10_io_flush                    ), //i
    .io_occupancy             (streamFifo_10_io_occupancy[2:0]           ), //o
    .io_availability          (streamFifo_10_io_availability[2:0]        ), //o
    .clk                      (clk                                       ), //i
    .reset                    (reset                                     )  //i
  );
  StreamFifo_4 streamFifo_11 (
    .io_push_valid            (_zz_io_push_valid_1                       ), //i
    .io_push_ready            (streamFifo_11_io_push_ready               ), //o
    .io_push_payload_address  (reqGen_io_output_payload_address[33:0]    ), //i
    .io_push_payload_burstLen (reqGen_io_output_payload_burstLen[7:0]    ), //i
    .io_pop_valid             (streamFifo_11_io_pop_valid                ), //o
    .io_pop_ready             (streamFifo_11_io_pop_ready                ), //i
    .io_pop_payload_address   (streamFifo_11_io_pop_payload_address[33:0]), //o
    .io_pop_payload_burstLen  (streamFifo_11_io_pop_payload_burstLen[7:0]), //o
    .io_flush                 (streamFifo_11_io_flush                    ), //i
    .io_occupancy             (streamFifo_11_io_occupancy[2:0]           ), //o
    .io_availability          (streamFifo_11_io_availability[2:0]        ), //o
    .clk                      (clk                                       ), //i
    .reset                    (reset                                     )  //i
  );
  StreamCCByToggle io_bus_b_ccToggle (
    .io_input_valid         (io_bus_b_valid                               ), //i
    .io_input_ready         (io_bus_b_ccToggle_io_input_ready             ), //o
    .io_input_payload_id    (io_bus_b_payload_id[1:0]                     ), //i
    .io_input_payload_resp  (io_bus_b_payload_resp[1:0]                   ), //i
    .io_output_valid        (io_bus_b_ccToggle_io_output_valid            ), //o
    .io_output_ready        (_zz_io_output_ready_5                        ), //i
    .io_output_payload_id   (io_bus_b_ccToggle_io_output_payload_id[1:0]  ), //o
    .io_output_payload_resp (io_bus_b_ccToggle_io_output_payload_resp[1:0]), //o
    .clk                    (clk                                          ), //i
    .reset                  (reset                                        ), //i
    .reset_syncronized      (reset_syncronized                            )  //i
  );
  StreamFifo_6 writerC_reqGen_io_isLast_toStream_fifo (
    .io_push_valid   (writerC_reqGen_io_isLast_toStream_valid                    ), //i
    .io_push_ready   (writerC_reqGen_io_isLast_toStream_fifo_io_push_ready       ), //o
    .io_push_payload (writerC_reqGen_io_isLast_toStream_payload                  ), //i
    .io_pop_valid    (writerC_reqGen_io_isLast_toStream_fifo_io_pop_valid        ), //o
    .io_pop_ready    (_zz_io_output_ready_5                                      ), //i
    .io_pop_payload  (writerC_reqGen_io_isLast_toStream_fifo_io_pop_payload      ), //o
    .io_flush        (writerC_reqGen_io_isLast_toStream_fifo_io_flush            ), //i
    .io_occupancy    (writerC_reqGen_io_isLast_toStream_fifo_io_occupancy[9:0]   ), //o
    .io_availability (writerC_reqGen_io_isLast_toStream_fifo_io_availability[9:0]), //o
    .clk             (clk                                                        ), //i
    .reset           (reset                                                      )  //i
  );
  StreamCCByToggle_2 requestsOut_ccToggle (
    .io_input_valid             (requestsOut_valid                                   ), //i
    .io_input_ready             (requestsOut_ccToggle_io_input_ready                 ), //o
    .io_input_payload_address   (requestsOut_payload_address[33:0]                   ), //i
    .io_input_payload_burstLen  (requestsOut_payload_burstLen[7:0]                   ), //i
    .io_output_valid            (requestsOut_ccToggle_io_output_valid                ), //o
    .io_output_ready            (requestsOut_ccToggle_io_output_ready                ), //i
    .io_output_payload_address  (requestsOut_ccToggle_io_output_payload_address[33:0]), //o
    .io_output_payload_burstLen (requestsOut_ccToggle_io_output_payload_burstLen[7:0]), //o
    .clk                        (clk                                                 ), //i
    .reset                      (reset                                               ), //i
    .reset_syncronized          (reset_syncronized                                   )  //i
  );
  always @(*) begin
    burstsPending_summand_2 = 4'b0000;
    if(when_Axi4Dma_l283) begin
      burstsPending_summand_2 = {3'd0, _zz_burstsPending_summand_2};
    end
  end

  always @(*) begin
    burstsPending_summand_1 = 4'b0000;
    if(requestsOut_fire) begin
      burstsPending_summand_1 = (4'b0000 - 4'b0001);
    end
  end

  assign burstsPending_willClear = 1'b0;
  assign io_cmd_ready = reqGen_io_input_ready;
  assign reqGen_io_input_payload_burstLen = (io_cmd_payload_burstLen - 34'h000000001);
  assign _zz_io_push_valid = (reqGen_io_output_valid && _zz_io_output_ready_1);
  assign _zz_io_output_ready = streamFifo_10_io_push_ready;
  assign _zz_requestsOut_valid = (4'b0001 <= burstsPending_summand_0);
  assign requestsOut_valid = (streamFifo_10_io_pop_valid && _zz_requestsOut_valid);
  assign streamFifo_10_io_pop_ready = (requestsOut_ready && _zz_requestsOut_valid);
  assign requestsOut_payload_address = streamFifo_10_io_pop_payload_address;
  assign requestsOut_payload_burstLen = streamFifo_10_io_pop_payload_burstLen;
  assign requestsOut_fire = (requestsOut_valid && requestsOut_ready);
  assign _zz_io_push_valid_1 = (reqGen_io_output_valid && _zz_io_output_ready_3);
  assign reqGen_io_output_ready = ((_zz_io_output_ready || (! _zz_io_output_ready_1)) && (_zz_io_output_ready_2 || (! _zz_io_output_ready_3)));
  assign _zz_io_output_ready_2 = streamFifo_11_io_push_ready;
  assign _zz_io_pop_ready = ({1'b0,streamFifo_11_io_pop_payload_burstLen} + _zz__zz_io_pop_ready);
  always @(*) begin
    _zz_io_push_payload_last = 1'b0;
    if((_zz_io_push_valid_2 && _zz_io_pop_ready_1)) begin
      _zz_io_push_payload_last = 1'b1;
    end
  end

  always @(*) begin
    _zz_1 = 1'b0;
    if(writerC_streamFifo_11_io_pop_fire) begin
      _zz_1 = 1'b1;
    end
  end

  always @(*) begin
    _zz_io_push_payload_last_1 = (_zz_io_push_payload_last_2 + _zz__zz_io_push_payload_last_1);
    if(_zz_1) begin
      _zz_io_push_payload_last_1 = 9'h000;
    end
  end

  assign _zz_io_push_valid_2 = (streamFifo_11_io_pop_valid && (_zz_io_pop_ready != 9'h000));
  assign streamFifo_11_io_pop_ready = ((_zz_io_pop_ready_1 && (_zz_io_pop_ready_2 == _zz_io_pop_ready)) || (_zz_io_pop_ready == 9'h000));
  assign writerC_streamFifo_11_io_pop_fire = (streamFifo_11_io_pop_valid && streamFifo_11_io_pop_ready);
  assign _zz_io_pop_ready_1 = _zz_io_data_ready;
  assign _zz_io_push_valid_3 = (io_data_valid && _zz_io_push_valid_2);
  assign _zz_io_data_ready = (_zz_io_push_valid_3 && (dataQueue_io_push_ready && _zz_io_push_valid_4));
  assign io_data_ready = _zz_io_data_ready;
  assign _zz_io_push_valid_4 = (! (burstsPending_summand_0 == 4'b1111));
  assign dataQueue_io_push_valid = (_zz_io_push_valid_3 && _zz_io_push_valid_4);
  assign dataQueue_io_push_payload_last = (_zz_io_push_payload_last_3 == _zz_io_push_payload_last_4);
  assign writerC_dataQueue_io_push_fire = (dataQueue_io_push_valid && dataQueue_io_push_ready);
  assign when_Axi4Dma_l283 = (writerC_dataQueue_io_push_fire && dataQueue_io_push_payload_last);
  assign io_bus_b_ready = io_bus_b_ccToggle_io_input_ready;
  assign writerC_reqGen_io_isLast_toStream_valid = reqGen_io_isLast_valid;
  assign writerC_reqGen_io_isLast_toStream_payload = reqGen_io_isLast_payload;
  assign writerC_reqGen_io_isLast_toStream_ready = writerC_reqGen_io_isLast_toStream_fifo_io_push_ready;
  assign _zz_io_cmdDone = (io_bus_b_ccToggle_io_output_valid && writerC_reqGen_io_isLast_toStream_fifo_io_pop_valid);
  assign _zz_io_output_ready_5 = (_zz_io_cmdDone && _zz_io_output_ready_4);
  assign when_Stream_l439 = (! writerC_reqGen_io_isLast_toStream_fifo_io_pop_payload);
  always @(*) begin
    _zz_io_cmdDone_1 = _zz_io_cmdDone;
    if(when_Stream_l439) begin
      _zz_io_cmdDone_1 = 1'b0;
    end
  end

  always @(*) begin
    _zz_io_output_ready_4 = 1'b1;
    if(when_Stream_l439) begin
      _zz_io_output_ready_4 = 1'b1;
    end
  end

  assign io_cmdDone = _zz_io_cmdDone_1;
  always @(*) begin
    dataQueue_io_pop_ready = writerC_dataQueue_io_pop_m2sPipe_ready;
    if(when_Stream_l369) begin
      dataQueue_io_pop_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! writerC_dataQueue_io_pop_m2sPipe_valid);
  assign writerC_dataQueue_io_pop_m2sPipe_valid = writerC_dataQueue_io_pop_rValid;
  assign writerC_dataQueue_io_pop_m2sPipe_payload_last = writerC_dataQueue_io_pop_rData_last;
  assign writerC_dataQueue_io_pop_m2sPipe_payload_fragment_data = writerC_dataQueue_io_pop_rData_fragment_data;
  assign writerC_dataQueue_io_pop_m2sPipe_payload_fragment_strb = writerC_dataQueue_io_pop_rData_fragment_strb;
  assign io_bus_w_valid = writerC_dataQueue_io_pop_m2sPipe_valid;
  assign writerC_dataQueue_io_pop_m2sPipe_ready = io_bus_w_ready;
  assign io_bus_w_payload_data = writerC_dataQueue_io_pop_m2sPipe_payload_fragment_data;
  assign io_bus_w_payload_strb = writerC_dataQueue_io_pop_m2sPipe_payload_fragment_strb;
  assign io_bus_w_payload_last = writerC_dataQueue_io_pop_m2sPipe_payload_last;
  assign requestsOut_ready = requestsOut_ccToggle_io_input_ready;
  always @(*) begin
    requestsOut_ccToggle_io_output_ready = writerC_requestsOut_ccToggle_io_output_m2sPipe_ready;
    if(when_Stream_l369_1) begin
      requestsOut_ccToggle_io_output_ready = 1'b1;
    end
  end

  assign when_Stream_l369_1 = (! writerC_requestsOut_ccToggle_io_output_m2sPipe_valid);
  assign writerC_requestsOut_ccToggle_io_output_m2sPipe_valid = writerC_requestsOut_ccToggle_io_output_rValid;
  assign writerC_requestsOut_ccToggle_io_output_m2sPipe_payload_address = writerC_requestsOut_ccToggle_io_output_rData_address;
  assign writerC_requestsOut_ccToggle_io_output_m2sPipe_payload_burstLen = writerC_requestsOut_ccToggle_io_output_rData_burstLen;
  always @(*) begin
    writerC_requestsOut_ccToggle_io_output_m2sPipe_ready = writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_ready;
    if(when_Stream_l369_2) begin
      writerC_requestsOut_ccToggle_io_output_m2sPipe_ready = 1'b1;
    end
  end

  assign when_Stream_l369_2 = (! writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_valid);
  assign writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_valid = writerC_requestsOut_ccToggle_io_output_m2sPipe_rValid;
  assign writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_payload_address = writerC_requestsOut_ccToggle_io_output_m2sPipe_rData_address;
  assign writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_payload_burstLen = writerC_requestsOut_ccToggle_io_output_m2sPipe_rData_burstLen;
  assign io_bus_aw_valid = writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_valid;
  assign writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_ready = io_bus_aw_ready;
  assign io_bus_aw_payload_addr = writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_payload_address;
  assign io_bus_aw_payload_len = writerC_requestsOut_ccToggle_io_output_m2sPipe_m2sPipe_payload_burstLen;
  assign io_bus_aw_payload_id = 2'b00;
  assign io_bus_aw_payload_size = 3'b110;
  assign io_bus_aw_payload_burst = 2'b01;
  assign io_bus_aw_payload_prot = 3'b000;
  always @(*) begin
    burstsPending_valueNext = (_zz_burstsPending_valueNext + burstsPending_summand_2);
    if(burstsPending_willClear) begin
      burstsPending_valueNext = 4'b0000;
    end
  end

  assign streamFifo_10_io_flush = 1'b0;
  assign streamFifo_11_io_flush = 1'b0;
  assign writerC_reqGen_io_isLast_toStream_fifo_io_flush = 1'b0;
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      burstsPending_summand_0 <= 4'b0000;
      _zz_io_output_ready_1 <= 1'b1;
      _zz_io_output_ready_3 <= 1'b1;
      _zz_io_push_payload_last_2 <= 9'h000;
      writerC_dataQueue_io_pop_rValid <= 1'b0;
      writerC_requestsOut_ccToggle_io_output_rValid <= 1'b0;
      writerC_requestsOut_ccToggle_io_output_m2sPipe_rValid <= 1'b0;
    end else begin
      burstsPending_summand_0 <= burstsPending_valueNext;
      if((_zz_io_push_valid && _zz_io_output_ready)) begin
        _zz_io_output_ready_1 <= 1'b0;
      end
      if(reqGen_io_output_ready) begin
        _zz_io_output_ready_1 <= 1'b1;
      end
      if((_zz_io_push_valid_1 && _zz_io_output_ready_2)) begin
        _zz_io_output_ready_3 <= 1'b0;
      end
      if(reqGen_io_output_ready) begin
        _zz_io_output_ready_3 <= 1'b1;
      end
      _zz_io_push_payload_last_2 <= _zz_io_push_payload_last_1;
      if(dataQueue_io_pop_ready) begin
        writerC_dataQueue_io_pop_rValid <= dataQueue_io_pop_valid;
      end
      if(requestsOut_ccToggle_io_output_ready) begin
        writerC_requestsOut_ccToggle_io_output_rValid <= requestsOut_ccToggle_io_output_valid;
      end
      if(writerC_requestsOut_ccToggle_io_output_m2sPipe_ready) begin
        writerC_requestsOut_ccToggle_io_output_m2sPipe_rValid <= writerC_requestsOut_ccToggle_io_output_m2sPipe_valid;
      end
    end
  end

  always @(posedge clk) begin
    if(dataQueue_io_pop_ready) begin
      writerC_dataQueue_io_pop_rData_last <= dataQueue_io_pop_payload_last;
      writerC_dataQueue_io_pop_rData_fragment_data <= dataQueue_io_pop_payload_fragment_data;
      writerC_dataQueue_io_pop_rData_fragment_strb <= dataQueue_io_pop_payload_fragment_strb;
    end
    if(requestsOut_ccToggle_io_output_ready) begin
      writerC_requestsOut_ccToggle_io_output_rData_address <= requestsOut_ccToggle_io_output_payload_address;
      writerC_requestsOut_ccToggle_io_output_rData_burstLen <= requestsOut_ccToggle_io_output_payload_burstLen;
    end
    if(writerC_requestsOut_ccToggle_io_output_m2sPipe_ready) begin
      writerC_requestsOut_ccToggle_io_output_m2sPipe_rData_address <= writerC_requestsOut_ccToggle_io_output_m2sPipe_payload_address;
      writerC_requestsOut_ccToggle_io_output_m2sPipe_rData_burstLen <= writerC_requestsOut_ccToggle_io_output_m2sPipe_payload_burstLen;
    end
  end


endmodule

module SimpleAxi4ReadDma_1 (
  output wire          io_bus_ar_valid,
  input  wire          io_bus_ar_ready,
  output wire [33:0]   io_bus_ar_payload_addr,
  output wire [0:0]    io_bus_ar_payload_id,
  output wire [7:0]    io_bus_ar_payload_len,
  output wire [2:0]    io_bus_ar_payload_size,
  output wire [1:0]    io_bus_ar_payload_burst,
  output wire [2:0]    io_bus_ar_payload_prot,
  input  wire          io_bus_r_valid,
  output wire          io_bus_r_ready,
  input  wire [511:0]  io_bus_r_payload_data,
  input  wire [0:0]    io_bus_r_payload_id,
  input  wire [1:0]    io_bus_r_payload_resp,
  input  wire          io_bus_r_payload_last,
  input  wire          io_cmd_valid,
  output wire          io_cmd_ready,
  input  wire [33:0]   io_cmd_payload_baseAddr,
  input  wire [33:0]   io_cmd_payload_burstLen,
  output wire          io_data_valid,
  input  wire          io_data_ready,
  output wire [511:0]  io_data_payload,
  input  wire          clk,
  input  wire          reset,
  input  wire          reset_syncronized
);

  wire       [33:0]   reqGen_io_input_payload_burstLen;
  wire                reqGen_io_output_ready;
  wire                outQueue_io_push_ready;
  wire                outQueue_io_pop_valid;
  wire       [511:0]  outQueue_io_pop_payload;
  wire       [6:0]    outQueue_io_pushOccupancy;
  wire       [6:0]    outQueue_io_popOccupancy;
  wire                reqGen_io_input_ready;
  wire                reqGen_io_output_valid;
  wire       [33:0]   reqGen_io_output_payload_address;
  wire       [7:0]    reqGen_io_output_payload_burstLen;
  wire                reqGen_io_isLast_valid;
  wire                reqGen_io_isLast_payload;
  wire                requests_ccToggle_io_input_ready;
  wire                requests_ccToggle_io_output_valid;
  wire       [33:0]   requests_ccToggle_io_output_payload_address;
  wire       [7:0]    requests_ccToggle_io_output_payload_burstLen;
  wire       [8:0]    _zz__zz_requests_valid;
  wire       [8:0]    _zz__zz_requests_valid_1;
  wire       [7:0]    _zz__zz_requests_valid_2;
  wire       [8:0]    _zz_dataPending_summand_2;
  wire       [8:0]    _zz_dataPending_summand_2_1;
  wire       [1:0]    _zz_dataPending_summand_2_2;
  wire       [6:0]    _zz_dataPending_valueNext;
  reg        [6:0]    dataPending_summand_2;
  reg        [6:0]    dataPending_summand_1;
  reg        [6:0]    dataPending_valueNext;
  reg        [6:0]    dataPending_summand_0;
  wire                dataPending_willClear;
  wire                io_data_fire;
  wire                _zz_requests_valid;
  wire                requests_valid;
  wire                requests_ready;
  wire       [33:0]   requests_payload_address;
  wire       [7:0]    requests_payload_burstLen;
  wire                requests_fire;
  wire                io_bus_r_translated_valid;
  wire                io_bus_r_translated_ready;
  wire       [511:0]  io_bus_r_translated_payload;

  assign _zz__zz_requests_valid = (_zz__zz_requests_valid_1 + {1'b0,reqGen_io_output_payload_burstLen});
  assign _zz__zz_requests_valid_2 = {1'b0,dataPending_summand_0};
  assign _zz__zz_requests_valid_1 = {1'd0, _zz__zz_requests_valid_2};
  assign _zz_dataPending_summand_2 = ({1'b0,requests_payload_burstLen} + _zz_dataPending_summand_2_1);
  assign _zz_dataPending_summand_2_2 = {1'b0,1'b1};
  assign _zz_dataPending_summand_2_1 = {7'd0, _zz_dataPending_summand_2_2};
  assign _zz_dataPending_valueNext = (dataPending_summand_0 + dataPending_summand_1);
  StreamFifoCCIfNecessary_2 outQueue (
    .io_push_valid    (io_bus_r_translated_valid         ), //i
    .io_push_ready    (outQueue_io_push_ready            ), //o
    .io_push_payload  (io_bus_r_translated_payload[511:0]), //i
    .io_pop_valid     (outQueue_io_pop_valid             ), //o
    .io_pop_ready     (io_data_ready                     ), //i
    .io_pop_payload   (outQueue_io_pop_payload[511:0]    ), //o
    .io_pushOccupancy (outQueue_io_pushOccupancy[6:0]    ), //o
    .io_popOccupancy  (outQueue_io_popOccupancy[6:0]     ), //o
    .clk              (clk                               ), //i
    .reset            (reset                             )  //i
  );
  MemRequestSlicer_2 reqGen (
    .io_input_valid             (io_cmd_valid                          ), //i
    .io_input_ready             (reqGen_io_input_ready                 ), //o
    .io_input_payload_address   (io_cmd_payload_baseAddr[33:0]         ), //i
    .io_input_payload_burstLen  (reqGen_io_input_payload_burstLen[33:0]), //i
    .io_output_valid            (reqGen_io_output_valid                ), //o
    .io_output_ready            (reqGen_io_output_ready                ), //i
    .io_output_payload_address  (reqGen_io_output_payload_address[33:0]), //o
    .io_output_payload_burstLen (reqGen_io_output_payload_burstLen[7:0]), //o
    .io_isLast_valid            (reqGen_io_isLast_valid                ), //o
    .io_isLast_payload          (reqGen_io_isLast_payload              ), //o
    .clk                        (clk                                   ), //i
    .reset                      (reset                                 )  //i
  );
  StreamCCByToggle_2 requests_ccToggle (
    .io_input_valid             (requests_valid                                   ), //i
    .io_input_ready             (requests_ccToggle_io_input_ready                 ), //o
    .io_input_payload_address   (requests_payload_address[33:0]                   ), //i
    .io_input_payload_burstLen  (requests_payload_burstLen[7:0]                   ), //i
    .io_output_valid            (requests_ccToggle_io_output_valid                ), //o
    .io_output_ready            (io_bus_ar_ready                                  ), //i
    .io_output_payload_address  (requests_ccToggle_io_output_payload_address[33:0]), //o
    .io_output_payload_burstLen (requests_ccToggle_io_output_payload_burstLen[7:0]), //o
    .clk                        (clk                                              ), //i
    .reset                      (reset                                            ), //i
    .reset_syncronized          (reset_syncronized                                )  //i
  );
  always @(*) begin
    dataPending_summand_2 = 7'h00;
    if(requests_fire) begin
      dataPending_summand_2 = _zz_dataPending_summand_2[6:0];
    end
  end

  always @(*) begin
    dataPending_summand_1 = 7'h00;
    if(io_data_fire) begin
      dataPending_summand_1 = (7'h00 - 7'h01);
    end
  end

  assign dataPending_willClear = 1'b0;
  assign io_data_valid = outQueue_io_pop_valid;
  assign io_data_payload = outQueue_io_pop_payload;
  assign io_data_fire = (io_data_valid && io_data_ready);
  assign io_cmd_ready = reqGen_io_input_ready;
  assign reqGen_io_input_payload_burstLen = (io_cmd_payload_burstLen - 34'h000000001);
  assign _zz_requests_valid = (! (9'h040 <= _zz__zz_requests_valid));
  assign requests_valid = (reqGen_io_output_valid && _zz_requests_valid);
  assign reqGen_io_output_ready = (requests_ready && _zz_requests_valid);
  assign requests_payload_address = reqGen_io_output_payload_address;
  assign requests_payload_burstLen = reqGen_io_output_payload_burstLen;
  assign requests_fire = (requests_valid && requests_ready);
  assign requests_ready = requests_ccToggle_io_input_ready;
  assign io_bus_ar_valid = requests_ccToggle_io_output_valid;
  assign io_bus_ar_payload_addr = requests_ccToggle_io_output_payload_address;
  assign io_bus_ar_payload_len = requests_ccToggle_io_output_payload_burstLen;
  assign io_bus_r_translated_valid = io_bus_r_valid;
  assign io_bus_r_ready = io_bus_r_translated_ready;
  assign io_bus_r_translated_payload = io_bus_r_payload_data;
  assign io_bus_r_translated_ready = outQueue_io_push_ready;
  assign io_bus_ar_payload_id = 1'b0;
  assign io_bus_ar_payload_size = 3'b110;
  assign io_bus_ar_payload_burst = 2'b01;
  assign io_bus_ar_payload_prot = 3'b000;
  always @(*) begin
    dataPending_valueNext = (_zz_dataPending_valueNext + dataPending_summand_2);
    if(dataPending_willClear) begin
      dataPending_valueNext = 7'h00;
    end
  end

  always @(posedge clk or posedge reset) begin
    if(reset) begin
      dataPending_summand_0 <= 7'h00;
    end else begin
      dataPending_summand_0 <= dataPending_valueNext;
    end
  end


endmodule

module SimpleAxi4ReadDma (
  output wire          io_bus_ar_valid,
  input  wire          io_bus_ar_ready,
  output wire [33:0]   io_bus_ar_payload_addr,
  output wire [0:0]    io_bus_ar_payload_id,
  output wire [7:0]    io_bus_ar_payload_len,
  output wire [2:0]    io_bus_ar_payload_size,
  output wire [1:0]    io_bus_ar_payload_burst,
  output wire [2:0]    io_bus_ar_payload_prot,
  input  wire          io_bus_r_valid,
  output wire          io_bus_r_ready,
  input  wire [511:0]  io_bus_r_payload_data,
  input  wire [0:0]    io_bus_r_payload_id,
  input  wire [1:0]    io_bus_r_payload_resp,
  input  wire          io_bus_r_payload_last,
  input  wire          io_cmd_valid,
  output wire          io_cmd_ready,
  input  wire [33:0]   io_cmd_payload_baseAddr,
  input  wire [33:0]   io_cmd_payload_burstLen,
  output wire          io_data_valid,
  input  wire          io_data_ready,
  output wire [511:0]  io_data_payload,
  input  wire          clk,
  input  wire          reset,
  output wire          reset_syncronized
);

  wire       [33:0]   reqGen_io_input_payload_burstLen;
  wire                reqGen_io_output_ready;
  wire                outQueue_io_push_ready;
  wire                outQueue_io_pop_valid;
  wire       [511:0]  outQueue_io_pop_payload;
  wire       [6:0]    outQueue_io_pushOccupancy;
  wire       [6:0]    outQueue_io_popOccupancy;
  wire                reqGen_io_input_ready;
  wire                reqGen_io_output_valid;
  wire       [33:0]   reqGen_io_output_payload_address;
  wire       [7:0]    reqGen_io_output_payload_burstLen;
  wire                reqGen_io_isLast_valid;
  wire                reqGen_io_isLast_payload;
  wire                requests_ccToggle_io_input_ready;
  wire                requests_ccToggle_io_output_valid;
  wire       [33:0]   requests_ccToggle_io_output_payload_address;
  wire       [7:0]    requests_ccToggle_io_output_payload_burstLen;
  wire                requests_ccToggle_reset_syncronized_1;
  wire       [8:0]    _zz__zz_requests_valid;
  wire       [8:0]    _zz__zz_requests_valid_1;
  wire       [7:0]    _zz__zz_requests_valid_2;
  wire       [8:0]    _zz_dataPending_summand_2;
  wire       [8:0]    _zz_dataPending_summand_2_1;
  wire       [1:0]    _zz_dataPending_summand_2_2;
  wire       [6:0]    _zz_dataPending_valueNext;
  reg        [6:0]    dataPending_summand_2;
  reg        [6:0]    dataPending_summand_1;
  reg        [6:0]    dataPending_valueNext;
  reg        [6:0]    dataPending_summand_0;
  wire                dataPending_willClear;
  wire                io_data_fire;
  wire                _zz_requests_valid;
  wire                requests_valid;
  wire                requests_ready;
  wire       [33:0]   requests_payload_address;
  wire       [7:0]    requests_payload_burstLen;
  wire                requests_fire;
  wire                io_bus_r_translated_valid;
  wire                io_bus_r_translated_ready;
  wire       [511:0]  io_bus_r_translated_payload;

  assign _zz__zz_requests_valid = (_zz__zz_requests_valid_1 + {1'b0,reqGen_io_output_payload_burstLen});
  assign _zz__zz_requests_valid_2 = {1'b0,dataPending_summand_0};
  assign _zz__zz_requests_valid_1 = {1'd0, _zz__zz_requests_valid_2};
  assign _zz_dataPending_summand_2 = ({1'b0,requests_payload_burstLen} + _zz_dataPending_summand_2_1);
  assign _zz_dataPending_summand_2_2 = {1'b0,1'b1};
  assign _zz_dataPending_summand_2_1 = {7'd0, _zz_dataPending_summand_2_2};
  assign _zz_dataPending_valueNext = (dataPending_summand_0 + dataPending_summand_1);
  StreamFifoCCIfNecessary_2 outQueue (
    .io_push_valid    (io_bus_r_translated_valid         ), //i
    .io_push_ready    (outQueue_io_push_ready            ), //o
    .io_push_payload  (io_bus_r_translated_payload[511:0]), //i
    .io_pop_valid     (outQueue_io_pop_valid             ), //o
    .io_pop_ready     (io_data_ready                     ), //i
    .io_pop_payload   (outQueue_io_pop_payload[511:0]    ), //o
    .io_pushOccupancy (outQueue_io_pushOccupancy[6:0]    ), //o
    .io_popOccupancy  (outQueue_io_popOccupancy[6:0]     ), //o
    .clk              (clk                               ), //i
    .reset            (reset                             )  //i
  );
  MemRequestSlicer_2 reqGen (
    .io_input_valid             (io_cmd_valid                          ), //i
    .io_input_ready             (reqGen_io_input_ready                 ), //o
    .io_input_payload_address   (io_cmd_payload_baseAddr[33:0]         ), //i
    .io_input_payload_burstLen  (reqGen_io_input_payload_burstLen[33:0]), //i
    .io_output_valid            (reqGen_io_output_valid                ), //o
    .io_output_ready            (reqGen_io_output_ready                ), //i
    .io_output_payload_address  (reqGen_io_output_payload_address[33:0]), //o
    .io_output_payload_burstLen (reqGen_io_output_payload_burstLen[7:0]), //o
    .io_isLast_valid            (reqGen_io_isLast_valid                ), //o
    .io_isLast_payload          (reqGen_io_isLast_payload              ), //o
    .clk                        (clk                                   ), //i
    .reset                      (reset                                 )  //i
  );
  StreamCCByToggle_3 requests_ccToggle (
    .io_input_valid             (requests_valid                                   ), //i
    .io_input_ready             (requests_ccToggle_io_input_ready                 ), //o
    .io_input_payload_address   (requests_payload_address[33:0]                   ), //i
    .io_input_payload_burstLen  (requests_payload_burstLen[7:0]                   ), //i
    .io_output_valid            (requests_ccToggle_io_output_valid                ), //o
    .io_output_ready            (io_bus_ar_ready                                  ), //i
    .io_output_payload_address  (requests_ccToggle_io_output_payload_address[33:0]), //o
    .io_output_payload_burstLen (requests_ccToggle_io_output_payload_burstLen[7:0]), //o
    .clk                        (clk                                              ), //i
    .reset                      (reset                                            ), //i
    .reset_syncronized_1        (requests_ccToggle_reset_syncronized_1            )  //o
  );
  always @(*) begin
    dataPending_summand_2 = 7'h00;
    if(requests_fire) begin
      dataPending_summand_2 = _zz_dataPending_summand_2[6:0];
    end
  end

  always @(*) begin
    dataPending_summand_1 = 7'h00;
    if(io_data_fire) begin
      dataPending_summand_1 = (7'h00 - 7'h01);
    end
  end

  assign dataPending_willClear = 1'b0;
  assign io_data_valid = outQueue_io_pop_valid;
  assign io_data_payload = outQueue_io_pop_payload;
  assign io_data_fire = (io_data_valid && io_data_ready);
  assign io_cmd_ready = reqGen_io_input_ready;
  assign reqGen_io_input_payload_burstLen = (io_cmd_payload_burstLen - 34'h000000001);
  assign _zz_requests_valid = (! (9'h040 <= _zz__zz_requests_valid));
  assign requests_valid = (reqGen_io_output_valid && _zz_requests_valid);
  assign reqGen_io_output_ready = (requests_ready && _zz_requests_valid);
  assign requests_payload_address = reqGen_io_output_payload_address;
  assign requests_payload_burstLen = reqGen_io_output_payload_burstLen;
  assign requests_fire = (requests_valid && requests_ready);
  assign requests_ready = requests_ccToggle_io_input_ready;
  assign io_bus_ar_valid = requests_ccToggle_io_output_valid;
  assign io_bus_ar_payload_addr = requests_ccToggle_io_output_payload_address;
  assign io_bus_ar_payload_len = requests_ccToggle_io_output_payload_burstLen;
  assign io_bus_r_translated_valid = io_bus_r_valid;
  assign io_bus_r_ready = io_bus_r_translated_ready;
  assign io_bus_r_translated_payload = io_bus_r_payload_data;
  assign io_bus_r_translated_ready = outQueue_io_push_ready;
  assign io_bus_ar_payload_id = 1'b0;
  assign io_bus_ar_payload_size = 3'b110;
  assign io_bus_ar_payload_burst = 2'b01;
  assign io_bus_ar_payload_prot = 3'b000;
  always @(*) begin
    dataPending_valueNext = (_zz_dataPending_valueNext + dataPending_summand_2);
    if(dataPending_willClear) begin
      dataPending_valueNext = 7'h00;
    end
  end

  assign reset_syncronized = requests_ccToggle_reset_syncronized_1;
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      dataPending_summand_0 <= 7'h00;
    end else begin
      dataPending_summand_0 <= dataPending_valueNext;
    end
  end


endmodule

module AccRegister (
  input  wire          io_cci_aw_valid,
  output reg           io_cci_aw_ready,
  input  wire [11:0]   io_cci_aw_payload_addr,
  input  wire [2:0]    io_cci_aw_payload_prot,
  input  wire          io_cci_w_valid,
  output reg           io_cci_w_ready,
  input  wire [63:0]   io_cci_w_payload_data,
  input  wire [7:0]    io_cci_w_payload_strb,
  output wire          io_cci_b_valid,
  input  wire          io_cci_b_ready,
  output wire [1:0]    io_cci_b_payload_resp,
  input  wire          io_cci_ar_valid,
  output reg           io_cci_ar_ready,
  input  wire [11:0]   io_cci_ar_payload_addr,
  input  wire [2:0]    io_cci_ar_payload_prot,
  output wire          io_cci_r_valid,
  input  wire          io_cci_r_ready,
  output wire [63:0]   io_cci_r_payload_data,
  output wire [1:0]    io_cci_r_payload_resp,
  output wire          io_memoryRegions_valid,
  output wire [7:0]    io_memoryRegions_payload_0_mrIndex,
  output wire [55:0]   io_memoryRegions_payload_0_address,
  output wire [31:0]   io_memoryRegions_payload_0_length,
  output wire [7:0]    io_memoryRegions_payload_1_mrIndex,
  output wire [55:0]   io_memoryRegions_payload_1_address,
  output wire [31:0]   io_memoryRegions_payload_1_length,
  output wire [7:0]    io_memoryRegions_payload_2_mrIndex,
  output wire [55:0]   io_memoryRegions_payload_2_address,
  output wire [31:0]   io_memoryRegions_payload_2_length,
  input  wire [63:0]   io_nextCciSubordinateOffset,
  input  wire [127:0]  io_uuid,
  input  wire          clk,
  input  wire          reset
);

  wire       [1:0]    _zz__zz_1;
  wire       [1:0]    _zz__zz_2;
  reg        [7:0]    currentMemoryRegions_0_mrIndex;
  reg        [55:0]   currentMemoryRegions_0_address;
  reg        [31:0]   currentMemoryRegions_0_length;
  reg        [7:0]    currentMemoryRegions_1_mrIndex;
  reg        [55:0]   currentMemoryRegions_1_address;
  reg        [31:0]   currentMemoryRegions_1_length;
  reg        [7:0]    currentMemoryRegions_2_mrIndex;
  reg        [55:0]   currentMemoryRegions_2_address;
  reg        [31:0]   currentMemoryRegions_2_length;
  reg        [1:0]    currentRegion;
  wire       [7:0]    cciInterface_wstrb;
  reg        [63:0]   cciInterface_wmask;
  reg        [63:0]   cciInterface_wmaskn;
  reg                 cciInterface_readError;
  reg        [63:0]   cciInterface_readData;
  wire                cciInterface_axiAr_valid;
  wire                cciInterface_axiAr_ready;
  wire       [11:0]   cciInterface_axiAr_payload_addr;
  wire       [2:0]    cciInterface_axiAr_payload_prot;
  reg                 io_cci_ar_rValid;
  reg        [11:0]   io_cci_ar_rData_addr;
  reg        [2:0]    io_cci_ar_rData_prot;
  wire                when_Stream_l369;
  wire                cciInterface_axiR_valid;
  wire                cciInterface_axiR_ready;
  wire       [63:0]   cciInterface_axiR_payload_data;
  reg        [1:0]    cciInterface_axiR_payload_resp;
  reg                 cciInterface_axiRValid;
  wire                cciInterface_axiAw_valid;
  wire                cciInterface_axiAw_ready;
  wire       [11:0]   cciInterface_axiAw_payload_addr;
  wire       [2:0]    cciInterface_axiAw_payload_prot;
  reg                 io_cci_aw_rValid;
  reg        [11:0]   io_cci_aw_rData_addr;
  reg        [2:0]    io_cci_aw_rData_prot;
  wire                when_Stream_l369_1;
  wire                cciInterface_axiW_valid;
  wire                cciInterface_axiW_ready;
  wire       [63:0]   cciInterface_axiW_payload_data;
  wire       [7:0]    cciInterface_axiW_payload_strb;
  reg                 io_cci_w_rValid;
  reg        [63:0]   io_cci_w_rData_data;
  reg        [7:0]    io_cci_w_rData_strb;
  wire                when_Stream_l369_2;
  wire                cciInterface_axiB_valid;
  wire                cciInterface_axiB_ready;
  wire       [1:0]    cciInterface_axiB_payload_resp;
  reg                 cciInterface_axiBValid;
  wire                cciInterface_askWrite;
  wire                cciInterface_askRead;
  wire                cciInterface_doWrite;
  wire                cciInterface_doRead;
  wire                read_hit_0x0000;
  wire                write_hit_0x0000;
  wire       [63:0]   unload;
  wire                read_hit_0x0008;
  wire                write_hit_0x0008;
  wire       [63:0]   unload_1;
  wire                read_hit_0x0010;
  wire                write_hit_0x0010;
  wire       [63:0]   unload_2;
  wire                read_hit_0x0028;
  wire                write_hit_0x0028;
  reg        [63:0]   testField;
  wire                read_hit_0x0048;
  wire                write_hit_0x0048;
  reg        [55:0]   mrAddressField;
  reg        [7:0]    mrIndex;
  reg                 mrAddressWritten;
  wire       [3:0]    _zz_1;
  wire       [55:0]   _zz_currentMemoryRegions_0_address;
  wire       [3:0]    _zz_2;
  wire       [7:0]    _zz_currentMemoryRegions_0_mrIndex;
  wire                read_hit_0x0050;
  wire                write_hit_0x0050;
  reg        [31:0]   mrLengthField;
  reg                 mrLengthWritten;
  wire       [3:0]    _zz_3;
  wire                read_hit_0x0058;
  wire                write_hit_0x0058;
  reg                 startRpcField;
  wire                when_RegInst_l741;
  wire       [11:0]   switch_BusIfBase_l353;

  assign _zz__zz_1 = mrIndex[1:0];
  assign _zz__zz_2 = mrIndex[1:0];
  always @(*) begin
    io_cci_ar_ready = cciInterface_axiAr_ready;
    if(when_Stream_l369) begin
      io_cci_ar_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! cciInterface_axiAr_valid);
  assign cciInterface_axiAr_valid = io_cci_ar_rValid;
  assign cciInterface_axiAr_payload_addr = io_cci_ar_rData_addr;
  assign cciInterface_axiAr_payload_prot = io_cci_ar_rData_prot;
  always @(*) begin
    io_cci_aw_ready = cciInterface_axiAw_ready;
    if(when_Stream_l369_1) begin
      io_cci_aw_ready = 1'b1;
    end
  end

  assign when_Stream_l369_1 = (! cciInterface_axiAw_valid);
  assign cciInterface_axiAw_valid = io_cci_aw_rValid;
  assign cciInterface_axiAw_payload_addr = io_cci_aw_rData_addr;
  assign cciInterface_axiAw_payload_prot = io_cci_aw_rData_prot;
  always @(*) begin
    io_cci_w_ready = cciInterface_axiW_ready;
    if(when_Stream_l369_2) begin
      io_cci_w_ready = 1'b1;
    end
  end

  assign when_Stream_l369_2 = (! cciInterface_axiW_valid);
  assign cciInterface_axiW_valid = io_cci_w_rValid;
  assign cciInterface_axiW_payload_data = io_cci_w_rData_data;
  assign cciInterface_axiW_payload_strb = io_cci_w_rData_strb;
  assign cciInterface_wstrb = (cciInterface_axiAr_valid ? 8'hff : cciInterface_axiW_payload_strb);
  always @(*) begin
    cciInterface_wmask[7 : 0] = (cciInterface_wstrb[0] ? 8'hff : 8'h00);
    cciInterface_wmask[15 : 8] = (cciInterface_wstrb[1] ? 8'hff : 8'h00);
    cciInterface_wmask[23 : 16] = (cciInterface_wstrb[2] ? 8'hff : 8'h00);
    cciInterface_wmask[31 : 24] = (cciInterface_wstrb[3] ? 8'hff : 8'h00);
    cciInterface_wmask[39 : 32] = (cciInterface_wstrb[4] ? 8'hff : 8'h00);
    cciInterface_wmask[47 : 40] = (cciInterface_wstrb[5] ? 8'hff : 8'h00);
    cciInterface_wmask[55 : 48] = (cciInterface_wstrb[6] ? 8'hff : 8'h00);
    cciInterface_wmask[63 : 56] = (cciInterface_wstrb[7] ? 8'hff : 8'h00);
  end

  always @(*) begin
    cciInterface_wmaskn[7 : 0] = (cciInterface_wstrb[0] ? 8'h00 : 8'hff);
    cciInterface_wmaskn[15 : 8] = (cciInterface_wstrb[1] ? 8'h00 : 8'hff);
    cciInterface_wmaskn[23 : 16] = (cciInterface_wstrb[2] ? 8'h00 : 8'hff);
    cciInterface_wmaskn[31 : 24] = (cciInterface_wstrb[3] ? 8'h00 : 8'hff);
    cciInterface_wmaskn[39 : 32] = (cciInterface_wstrb[4] ? 8'h00 : 8'hff);
    cciInterface_wmaskn[47 : 40] = (cciInterface_wstrb[5] ? 8'h00 : 8'hff);
    cciInterface_wmaskn[55 : 48] = (cciInterface_wstrb[6] ? 8'h00 : 8'hff);
    cciInterface_wmaskn[63 : 56] = (cciInterface_wstrb[7] ? 8'h00 : 8'hff);
  end

  always @(*) begin
    if(cciInterface_readError) begin
      cciInterface_axiR_payload_resp = 2'b10;
    end else begin
      cciInterface_axiR_payload_resp = 2'b00;
    end
  end

  assign cciInterface_axiR_valid = cciInterface_axiRValid;
  assign cciInterface_axiR_payload_data = cciInterface_readData;
  assign cciInterface_axiB_payload_resp = 2'b00;
  assign cciInterface_axiB_valid = cciInterface_axiBValid;
  assign io_cci_r_valid = cciInterface_axiR_valid;
  assign cciInterface_axiR_ready = io_cci_r_ready;
  assign io_cci_r_payload_data = cciInterface_axiR_payload_data;
  assign io_cci_r_payload_resp = cciInterface_axiR_payload_resp;
  assign io_cci_b_valid = cciInterface_axiB_valid;
  assign cciInterface_axiB_ready = io_cci_b_ready;
  assign io_cci_b_payload_resp = cciInterface_axiB_payload_resp;
  assign cciInterface_askWrite = (cciInterface_axiAw_valid && cciInterface_axiW_valid);
  assign cciInterface_askRead = (cciInterface_axiAr_valid || (cciInterface_axiR_valid && (! cciInterface_axiR_ready)));
  assign cciInterface_doWrite = (cciInterface_askWrite && ((! cciInterface_axiB_valid) || cciInterface_axiB_ready));
  assign cciInterface_doRead = (cciInterface_axiAr_valid && ((! cciInterface_axiR_valid) || cciInterface_axiR_ready));
  assign cciInterface_axiAr_ready = cciInterface_doRead;
  assign cciInterface_axiAw_ready = cciInterface_doWrite;
  assign cciInterface_axiW_ready = cciInterface_doWrite;
  assign read_hit_0x0000 = (({cciInterface_axiAr_payload_addr[11 : 3],3'b000} == 12'h000) && cciInterface_doRead);
  assign write_hit_0x0000 = ((cciInterface_axiAw_payload_addr == 12'h000) && cciInterface_doWrite);
  assign unload = io_nextCciSubordinateOffset;
  assign read_hit_0x0008 = (({cciInterface_axiAr_payload_addr[11 : 3],3'b000} == 12'h008) && cciInterface_doRead);
  assign write_hit_0x0008 = ((cciInterface_axiAw_payload_addr == 12'h008) && cciInterface_doWrite);
  assign unload_1 = io_uuid[63 : 0];
  assign read_hit_0x0010 = (({cciInterface_axiAr_payload_addr[11 : 3],3'b000} == 12'h010) && cciInterface_doRead);
  assign write_hit_0x0010 = ((cciInterface_axiAw_payload_addr == 12'h010) && cciInterface_doWrite);
  assign unload_2 = io_uuid[127 : 64];
  assign read_hit_0x0028 = (({cciInterface_axiAr_payload_addr[11 : 3],3'b000} == 12'h028) && cciInterface_doRead);
  assign write_hit_0x0028 = ((cciInterface_axiAw_payload_addr == 12'h028) && cciInterface_doWrite);
  assign read_hit_0x0048 = (({cciInterface_axiAr_payload_addr[11 : 3],3'b000} == 12'h048) && cciInterface_doRead);
  assign write_hit_0x0048 = ((cciInterface_axiAw_payload_addr == 12'h048) && cciInterface_doWrite);
  assign _zz_1 = ({3'd0,1'b1} <<< _zz__zz_1);
  assign _zz_currentMemoryRegions_0_address = mrAddressField;
  assign _zz_2 = ({3'd0,1'b1} <<< _zz__zz_2);
  assign _zz_currentMemoryRegions_0_mrIndex = mrIndex;
  assign read_hit_0x0050 = (({cciInterface_axiAr_payload_addr[11 : 3],3'b000} == 12'h050) && cciInterface_doRead);
  assign write_hit_0x0050 = ((cciInterface_axiAw_payload_addr == 12'h050) && cciInterface_doWrite);
  assign _zz_3 = ({3'd0,1'b1} <<< currentRegion);
  assign read_hit_0x0058 = (({cciInterface_axiAr_payload_addr[11 : 3],3'b000} == 12'h058) && cciInterface_doRead);
  assign write_hit_0x0058 = ((cciInterface_axiAw_payload_addr == 12'h058) && cciInterface_doWrite);
  assign when_RegInst_l741 = (write_hit_0x0058 && (cciInterface_axiW_payload_data[0] && cciInterface_wmask[0]));
  assign io_memoryRegions_valid = startRpcField;
  assign io_memoryRegions_payload_0_mrIndex = currentMemoryRegions_0_mrIndex;
  assign io_memoryRegions_payload_0_address = currentMemoryRegions_0_address;
  assign io_memoryRegions_payload_0_length = currentMemoryRegions_0_length;
  assign io_memoryRegions_payload_1_mrIndex = currentMemoryRegions_1_mrIndex;
  assign io_memoryRegions_payload_1_address = currentMemoryRegions_1_address;
  assign io_memoryRegions_payload_1_length = currentMemoryRegions_1_length;
  assign io_memoryRegions_payload_2_mrIndex = currentMemoryRegions_2_mrIndex;
  assign io_memoryRegions_payload_2_address = currentMemoryRegions_2_address;
  assign io_memoryRegions_payload_2_length = currentMemoryRegions_2_length;
  assign switch_BusIfBase_l353 = {cciInterface_axiAr_payload_addr[11 : 3],3'b000};
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      currentRegion <= 2'b00;
      cciInterface_readError <= 1'b0;
      cciInterface_readData <= 64'h0000000000000000;
      io_cci_ar_rValid <= 1'b0;
      cciInterface_axiRValid <= 1'b0;
      io_cci_aw_rValid <= 1'b0;
      io_cci_w_rValid <= 1'b0;
      cciInterface_axiBValid <= 1'b0;
      testField <= 64'h0000000000000000;
      mrAddressField <= 56'h00000000000000;
      mrIndex <= 8'h00;
      mrLengthField <= 32'h00000000;
      startRpcField <= 1'b0;
    end else begin
      if(io_cci_ar_ready) begin
        io_cci_ar_rValid <= io_cci_ar_valid;
      end
      if(io_cci_aw_ready) begin
        io_cci_aw_rValid <= io_cci_aw_valid;
      end
      if(io_cci_w_ready) begin
        io_cci_w_rValid <= io_cci_w_valid;
      end
      if(cciInterface_axiR_ready) begin
        cciInterface_axiRValid <= 1'b0;
      end
      if(cciInterface_doRead) begin
        cciInterface_axiRValid <= 1'b1;
      end
      if(cciInterface_axiB_ready) begin
        cciInterface_axiBValid <= 1'b0;
      end
      if(cciInterface_doWrite) begin
        cciInterface_axiBValid <= 1'b1;
      end
      if(write_hit_0x0028) begin
        testField <= ((testField & cciInterface_wmaskn[63 : 0]) | (cciInterface_axiW_payload_data[63 : 0] & cciInterface_wmask[63 : 0]));
      end
      if(write_hit_0x0048) begin
        mrAddressField <= ((mrAddressField & cciInterface_wmaskn[55 : 0]) | (cciInterface_axiW_payload_data[55 : 0] & cciInterface_wmask[55 : 0]));
      end
      if(write_hit_0x0048) begin
        mrIndex <= ((mrIndex & cciInterface_wmaskn[63 : 56]) | (cciInterface_axiW_payload_data[63 : 56] & cciInterface_wmask[63 : 56]));
      end
      if(mrAddressWritten) begin
        currentRegion <= mrIndex[1:0];
      end
      if(write_hit_0x0050) begin
        mrLengthField <= ((mrLengthField & cciInterface_wmaskn[31 : 0]) | (cciInterface_axiW_payload_data[31 : 0] & cciInterface_wmask[31 : 0]));
      end
      if(when_RegInst_l741) begin
        startRpcField <= ((startRpcField && cciInterface_wmaskn[0]) || ((! startRpcField) && cciInterface_wmask[0]));
      end else begin
        startRpcField <= 1'b0;
      end
      if(cciInterface_askRead) begin
        case(switch_BusIfBase_l353)
          12'h000 : begin
            cciInterface_readData <= unload;
            cciInterface_readError <= 1'b0;
          end
          12'h008 : begin
            cciInterface_readData <= unload_1;
            cciInterface_readError <= 1'b0;
          end
          12'h010 : begin
            cciInterface_readData <= unload_2;
            cciInterface_readError <= 1'b0;
          end
          12'h028 : begin
            cciInterface_readData <= testField;
            cciInterface_readError <= 1'b0;
          end
          12'h048 : begin
            cciInterface_readData <= {8'h00,56'h00000000000000};
            cciInterface_readError <= 1'b1;
          end
          12'h050 : begin
            cciInterface_readData <= {32'h00000000,32'h00000000};
            cciInterface_readError <= 1'b1;
          end
          12'h058 : begin
            cciInterface_readData <= {63'h0000000000000000,startRpcField};
            cciInterface_readError <= 1'b0;
          end
          default : begin
            cciInterface_readData <= 64'h0000000000000000;
            cciInterface_readError <= 1'b0;
          end
        endcase
      end else begin
        cciInterface_readData <= 64'h0000000000000000;
        cciInterface_readError <= 1'b0;
      end
    end
  end

  always @(posedge clk) begin
    if(io_cci_ar_ready) begin
      io_cci_ar_rData_addr <= io_cci_ar_payload_addr;
      io_cci_ar_rData_prot <= io_cci_ar_payload_prot;
    end
    if(io_cci_aw_ready) begin
      io_cci_aw_rData_addr <= io_cci_aw_payload_addr;
      io_cci_aw_rData_prot <= io_cci_aw_payload_prot;
    end
    if(io_cci_w_ready) begin
      io_cci_w_rData_data <= io_cci_w_payload_data;
      io_cci_w_rData_strb <= io_cci_w_payload_strb;
    end
    mrAddressWritten <= write_hit_0x0048;
    if(mrAddressWritten) begin
      if(_zz_1[0]) begin
        currentMemoryRegions_0_address <= _zz_currentMemoryRegions_0_address;
      end
      if(_zz_1[1]) begin
        currentMemoryRegions_1_address <= _zz_currentMemoryRegions_0_address;
      end
      if(_zz_1[2]) begin
        currentMemoryRegions_2_address <= _zz_currentMemoryRegions_0_address;
      end
      if(_zz_2[0]) begin
        currentMemoryRegions_0_mrIndex <= _zz_currentMemoryRegions_0_mrIndex;
      end
      if(_zz_2[1]) begin
        currentMemoryRegions_1_mrIndex <= _zz_currentMemoryRegions_0_mrIndex;
      end
      if(_zz_2[2]) begin
        currentMemoryRegions_2_mrIndex <= _zz_currentMemoryRegions_0_mrIndex;
      end
    end
    mrLengthWritten <= write_hit_0x0050;
    if(mrLengthWritten) begin
      if(_zz_3[0]) begin
        currentMemoryRegions_0_length <= mrLengthField;
      end
      if(_zz_3[1]) begin
        currentMemoryRegions_1_length <= mrLengthField;
      end
      if(_zz_3[2]) begin
        currentMemoryRegions_2_length <= mrLengthField;
      end
    end
  end


endmodule

module StreamArbiter (
  input  wire          io_inputs_0_valid,
  output wire          io_inputs_0_ready,
  input  wire [33:0]   io_inputs_0_payload_addr,
  input  wire [0:0]    io_inputs_0_payload_id,
  input  wire [7:0]    io_inputs_0_payload_len,
  input  wire [2:0]    io_inputs_0_payload_size,
  input  wire [1:0]    io_inputs_0_payload_burst,
  input  wire [2:0]    io_inputs_0_payload_prot,
  input  wire          io_inputs_1_valid,
  output wire          io_inputs_1_ready,
  input  wire [33:0]   io_inputs_1_payload_addr,
  input  wire [0:0]    io_inputs_1_payload_id,
  input  wire [7:0]    io_inputs_1_payload_len,
  input  wire [2:0]    io_inputs_1_payload_size,
  input  wire [1:0]    io_inputs_1_payload_burst,
  input  wire [2:0]    io_inputs_1_payload_prot,
  output wire          io_output_valid,
  input  wire          io_output_ready,
  output wire [33:0]   io_output_payload_addr,
  output wire [0:0]    io_output_payload_id,
  output wire [7:0]    io_output_payload_len,
  output wire [2:0]    io_output_payload_size,
  output wire [1:0]    io_output_payload_burst,
  output wire [2:0]    io_output_payload_prot,
  output wire [0:0]    io_chosen,
  output wire [1:0]    io_chosenOH,
  input  wire          clk,
  input  wire          reset
);

  wire       [3:0]    _zz__zz_maskProposal_0_2;
  wire       [3:0]    _zz__zz_maskProposal_0_2_1;
  wire       [1:0]    _zz__zz_maskProposal_0_2_2;
  reg                 locked;
  wire                maskProposal_0;
  wire                maskProposal_1;
  reg                 maskLocked_0;
  reg                 maskLocked_1;
  wire                maskRouted_0;
  wire                maskRouted_1;
  wire       [1:0]    _zz_maskProposal_0;
  wire       [3:0]    _zz_maskProposal_0_1;
  wire       [3:0]    _zz_maskProposal_0_2;
  wire       [1:0]    _zz_maskProposal_0_3;
  wire                io_output_fire;
  wire                _zz_io_chosen;

  assign _zz__zz_maskProposal_0_2 = (_zz_maskProposal_0_1 - _zz__zz_maskProposal_0_2_1);
  assign _zz__zz_maskProposal_0_2_2 = {maskLocked_0,maskLocked_1};
  assign _zz__zz_maskProposal_0_2_1 = {2'd0, _zz__zz_maskProposal_0_2_2};
  assign maskRouted_0 = (locked ? maskLocked_0 : maskProposal_0);
  assign maskRouted_1 = (locked ? maskLocked_1 : maskProposal_1);
  assign _zz_maskProposal_0 = {io_inputs_1_valid,io_inputs_0_valid};
  assign _zz_maskProposal_0_1 = {_zz_maskProposal_0,_zz_maskProposal_0};
  assign _zz_maskProposal_0_2 = (_zz_maskProposal_0_1 & (~ _zz__zz_maskProposal_0_2));
  assign _zz_maskProposal_0_3 = (_zz_maskProposal_0_2[3 : 2] | _zz_maskProposal_0_2[1 : 0]);
  assign maskProposal_0 = _zz_maskProposal_0_3[0];
  assign maskProposal_1 = _zz_maskProposal_0_3[1];
  assign io_output_fire = (io_output_valid && io_output_ready);
  assign io_output_valid = ((io_inputs_0_valid && maskRouted_0) || (io_inputs_1_valid && maskRouted_1));
  assign io_output_payload_addr = (maskRouted_0 ? io_inputs_0_payload_addr : io_inputs_1_payload_addr);
  assign io_output_payload_id = (maskRouted_0 ? io_inputs_0_payload_id : io_inputs_1_payload_id);
  assign io_output_payload_len = (maskRouted_0 ? io_inputs_0_payload_len : io_inputs_1_payload_len);
  assign io_output_payload_size = (maskRouted_0 ? io_inputs_0_payload_size : io_inputs_1_payload_size);
  assign io_output_payload_burst = (maskRouted_0 ? io_inputs_0_payload_burst : io_inputs_1_payload_burst);
  assign io_output_payload_prot = (maskRouted_0 ? io_inputs_0_payload_prot : io_inputs_1_payload_prot);
  assign io_inputs_0_ready = (maskRouted_0 && io_output_ready);
  assign io_inputs_1_ready = (maskRouted_1 && io_output_ready);
  assign io_chosenOH = {maskRouted_1,maskRouted_0};
  assign _zz_io_chosen = io_chosenOH[1];
  assign io_chosen = _zz_io_chosen;
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      locked <= 1'b0;
      maskLocked_0 <= 1'b0;
      maskLocked_1 <= 1'b1;
    end else begin
      if(io_output_valid) begin
        maskLocked_0 <= maskRouted_0;
        maskLocked_1 <= maskRouted_1;
      end
      if(io_output_valid) begin
        locked <= 1'b1;
      end
      if(io_output_fire) begin
        locked <= 1'b0;
      end
    end
  end


endmodule

//StreamCCByToggle_1 replaced by StreamCCByToggle_2

module StreamFifo_6 (
  input  wire          io_push_valid,
  output wire          io_push_ready,
  input  wire          io_push_payload,
  output wire          io_pop_valid,
  input  wire          io_pop_ready,
  output wire          io_pop_payload,
  input  wire          io_flush,
  output wire [9:0]    io_occupancy,
  output wire [9:0]    io_availability,
  input  wire          clk,
  input  wire          reset
);

  reg        [0:0]    _zz_logic_ram_port1;
  wire       [0:0]    _zz_logic_ram_port;
  reg                 _zz_1;
  wire                logic_ptr_doPush;
  wire                logic_ptr_doPop;
  wire                logic_ptr_full;
  wire                logic_ptr_empty;
  reg        [9:0]    logic_ptr_push;
  reg        [9:0]    logic_ptr_pop;
  wire       [9:0]    logic_ptr_occupancy;
  wire       [9:0]    logic_ptr_popOnIo;
  wire                when_Stream_l1205;
  reg                 logic_ptr_wentUp;
  wire                io_push_fire;
  wire                logic_push_onRam_write_valid;
  wire       [8:0]    logic_push_onRam_write_payload_address;
  wire                logic_push_onRam_write_payload_data;
  wire                logic_pop_addressGen_valid;
  reg                 logic_pop_addressGen_ready;
  wire       [8:0]    logic_pop_addressGen_payload;
  wire                logic_pop_addressGen_fire;
  wire                logic_pop_sync_readArbitation_valid;
  wire                logic_pop_sync_readArbitation_ready;
  wire       [8:0]    logic_pop_sync_readArbitation_payload;
  reg                 logic_pop_addressGen_rValid;
  reg        [8:0]    logic_pop_addressGen_rData;
  wire                when_Stream_l369;
  wire                logic_pop_sync_readPort_cmd_valid;
  wire       [8:0]    logic_pop_sync_readPort_cmd_payload;
  wire                logic_pop_sync_readPort_rsp;
  wire                logic_pop_sync_readArbitation_translated_valid;
  wire                logic_pop_sync_readArbitation_translated_ready;
  wire                logic_pop_sync_readArbitation_translated_payload;
  wire                logic_pop_sync_readArbitation_fire;
  reg        [9:0]    logic_pop_sync_popReg;
  reg [0:0] logic_ram [0:511];

  assign _zz_logic_ram_port = logic_push_onRam_write_payload_data;
  always @(posedge clk) begin
    if(_zz_1) begin
      logic_ram[logic_push_onRam_write_payload_address] <= _zz_logic_ram_port;
    end
  end

  always @(posedge clk) begin
    if(logic_pop_sync_readPort_cmd_valid) begin
      _zz_logic_ram_port1 <= logic_ram[logic_pop_sync_readPort_cmd_payload];
    end
  end

  always @(*) begin
    _zz_1 = 1'b0;
    if(logic_push_onRam_write_valid) begin
      _zz_1 = 1'b1;
    end
  end

  assign when_Stream_l1205 = (logic_ptr_doPush != logic_ptr_doPop);
  assign logic_ptr_full = (((logic_ptr_push ^ logic_ptr_popOnIo) ^ 10'h200) == 10'h000);
  assign logic_ptr_empty = (logic_ptr_push == logic_ptr_pop);
  assign logic_ptr_occupancy = (logic_ptr_push - logic_ptr_popOnIo);
  assign io_push_ready = (! logic_ptr_full);
  assign io_push_fire = (io_push_valid && io_push_ready);
  assign logic_ptr_doPush = io_push_fire;
  assign logic_push_onRam_write_valid = io_push_fire;
  assign logic_push_onRam_write_payload_address = logic_ptr_push[8:0];
  assign logic_push_onRam_write_payload_data = io_push_payload;
  assign logic_pop_addressGen_valid = (! logic_ptr_empty);
  assign logic_pop_addressGen_payload = logic_ptr_pop[8:0];
  assign logic_pop_addressGen_fire = (logic_pop_addressGen_valid && logic_pop_addressGen_ready);
  assign logic_ptr_doPop = logic_pop_addressGen_fire;
  always @(*) begin
    logic_pop_addressGen_ready = logic_pop_sync_readArbitation_ready;
    if(when_Stream_l369) begin
      logic_pop_addressGen_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! logic_pop_sync_readArbitation_valid);
  assign logic_pop_sync_readArbitation_valid = logic_pop_addressGen_rValid;
  assign logic_pop_sync_readArbitation_payload = logic_pop_addressGen_rData;
  assign logic_pop_sync_readPort_rsp = _zz_logic_ram_port1[0];
  assign logic_pop_sync_readPort_cmd_valid = logic_pop_addressGen_fire;
  assign logic_pop_sync_readPort_cmd_payload = logic_pop_addressGen_payload;
  assign logic_pop_sync_readArbitation_translated_valid = logic_pop_sync_readArbitation_valid;
  assign logic_pop_sync_readArbitation_ready = logic_pop_sync_readArbitation_translated_ready;
  assign logic_pop_sync_readArbitation_translated_payload = logic_pop_sync_readPort_rsp;
  assign io_pop_valid = logic_pop_sync_readArbitation_translated_valid;
  assign logic_pop_sync_readArbitation_translated_ready = io_pop_ready;
  assign io_pop_payload = logic_pop_sync_readArbitation_translated_payload;
  assign logic_pop_sync_readArbitation_fire = (logic_pop_sync_readArbitation_valid && logic_pop_sync_readArbitation_ready);
  assign logic_ptr_popOnIo = logic_pop_sync_popReg;
  assign io_occupancy = logic_ptr_occupancy;
  assign io_availability = (10'h200 - logic_ptr_occupancy);
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      logic_ptr_push <= 10'h000;
      logic_ptr_pop <= 10'h000;
      logic_ptr_wentUp <= 1'b0;
      logic_pop_addressGen_rValid <= 1'b0;
      logic_pop_sync_popReg <= 10'h000;
    end else begin
      if(when_Stream_l1205) begin
        logic_ptr_wentUp <= logic_ptr_doPush;
      end
      if(io_flush) begin
        logic_ptr_wentUp <= 1'b0;
      end
      if(logic_ptr_doPush) begin
        logic_ptr_push <= (logic_ptr_push + 10'h001);
      end
      if(logic_ptr_doPop) begin
        logic_ptr_pop <= (logic_ptr_pop + 10'h001);
      end
      if(io_flush) begin
        logic_ptr_push <= 10'h000;
        logic_ptr_pop <= 10'h000;
      end
      if(logic_pop_addressGen_ready) begin
        logic_pop_addressGen_rValid <= logic_pop_addressGen_valid;
      end
      if(io_flush) begin
        logic_pop_addressGen_rValid <= 1'b0;
      end
      if(logic_pop_sync_readArbitation_fire) begin
        logic_pop_sync_popReg <= logic_ptr_pop;
      end
      if(io_flush) begin
        logic_pop_sync_popReg <= 10'h000;
      end
    end
  end

  always @(posedge clk) begin
    if(logic_pop_addressGen_ready) begin
      logic_pop_addressGen_rData <= logic_pop_addressGen_payload;
    end
  end


endmodule

module StreamCCByToggle (
  input  wire          io_input_valid,
  output wire          io_input_ready,
  input  wire [1:0]    io_input_payload_id,
  input  wire [1:0]    io_input_payload_resp,
  output wire          io_output_valid,
  input  wire          io_output_ready,
  output wire [1:0]    io_output_payload_id,
  output wire [1:0]    io_output_payload_resp,
  input  wire          clk,
  input  wire          reset,
  input  wire          reset_syncronized
);

  wire                outHitSignal_buffercc_io_dataOut;
  wire                pushArea_target_buffercc_io_dataOut;
  wire                outHitSignal;
  wire                pushArea_hit;
  wire                pushArea_accept;
  reg                 pushArea_target;
  reg        [1:0]    pushArea_data_id;
  reg        [1:0]    pushArea_data_resp;
  wire                io_input_fire;
  wire                popArea_stream_valid;
  reg                 popArea_stream_ready;
  wire       [1:0]    popArea_stream_payload_id;
  wire       [1:0]    popArea_stream_payload_resp;
  wire                popArea_target;
  wire                popArea_stream_fire;
  reg                 popArea_hit;
  wire                popArea_stream_m2sPipe_valid;
  wire                popArea_stream_m2sPipe_ready;
  wire       [1:0]    popArea_stream_m2sPipe_payload_id;
  wire       [1:0]    popArea_stream_m2sPipe_payload_resp;
  reg                 popArea_stream_rValid;
  (* async_reg = "true" *) reg        [1:0]    popArea_stream_rData_id;
  (* async_reg = "true" *) reg        [1:0]    popArea_stream_rData_resp;
  wire                when_Stream_l369;

  BufferCC_6 outHitSignal_buffercc (
    .io_dataIn  (outHitSignal                    ), //i
    .io_dataOut (outHitSignal_buffercc_io_dataOut), //o
    .clk        (clk                             ), //i
    .reset      (reset                           )  //i
  );
  BufferCC_8 pushArea_target_buffercc (
    .io_dataIn         (pushArea_target                    ), //i
    .io_dataOut        (pushArea_target_buffercc_io_dataOut), //o
    .clk               (clk                                ), //i
    .reset_syncronized (reset_syncronized                  )  //i
  );
  assign pushArea_hit = outHitSignal_buffercc_io_dataOut;
  assign io_input_fire = (io_input_valid && io_input_ready);
  assign pushArea_accept = io_input_fire;
  assign io_input_ready = (pushArea_hit == pushArea_target);
  assign popArea_target = pushArea_target_buffercc_io_dataOut;
  assign popArea_stream_fire = (popArea_stream_valid && popArea_stream_ready);
  assign outHitSignal = popArea_hit;
  assign popArea_stream_valid = (popArea_target != popArea_hit);
  assign popArea_stream_payload_id = pushArea_data_id;
  assign popArea_stream_payload_resp = pushArea_data_resp;
  always @(*) begin
    popArea_stream_ready = popArea_stream_m2sPipe_ready;
    if(when_Stream_l369) begin
      popArea_stream_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! popArea_stream_m2sPipe_valid);
  assign popArea_stream_m2sPipe_valid = popArea_stream_rValid;
  assign popArea_stream_m2sPipe_payload_id = popArea_stream_rData_id;
  assign popArea_stream_m2sPipe_payload_resp = popArea_stream_rData_resp;
  assign io_output_valid = popArea_stream_m2sPipe_valid;
  assign popArea_stream_m2sPipe_ready = io_output_ready;
  assign io_output_payload_id = popArea_stream_m2sPipe_payload_id;
  assign io_output_payload_resp = popArea_stream_m2sPipe_payload_resp;
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      pushArea_target <= 1'b0;
    end else begin
      if(pushArea_accept) begin
        pushArea_target <= (! pushArea_target);
      end
    end
  end

  always @(posedge clk) begin
    if(pushArea_accept) begin
      pushArea_data_id <= io_input_payload_id;
      pushArea_data_resp <= io_input_payload_resp;
    end
  end

  always @(posedge clk or posedge reset_syncronized) begin
    if(reset_syncronized) begin
      popArea_hit <= 1'b0;
      popArea_stream_rValid <= 1'b0;
    end else begin
      if(popArea_stream_fire) begin
        popArea_hit <= popArea_target;
      end
      if(popArea_stream_ready) begin
        popArea_stream_rValid <= popArea_stream_valid;
      end
    end
  end

  always @(posedge clk) begin
    if(popArea_stream_fire) begin
      popArea_stream_rData_id <= popArea_stream_payload_id;
      popArea_stream_rData_resp <= popArea_stream_payload_resp;
    end
  end


endmodule

//StreamFifo_5 replaced by StreamFifo_4

module StreamFifo_4 (
  input  wire          io_push_valid,
  output wire          io_push_ready,
  input  wire [33:0]   io_push_payload_address,
  input  wire [7:0]    io_push_payload_burstLen,
  output wire          io_pop_valid,
  input  wire          io_pop_ready,
  output wire [33:0]   io_pop_payload_address,
  output wire [7:0]    io_pop_payload_burstLen,
  input  wire          io_flush,
  output wire [2:0]    io_occupancy,
  output wire [2:0]    io_availability,
  input  wire          clk,
  input  wire          reset
);

  reg        [41:0]   _zz_logic_ram_port1;
  wire       [41:0]   _zz_logic_ram_port;
  reg                 _zz_1;
  wire                logic_ptr_doPush;
  wire                logic_ptr_doPop;
  wire                logic_ptr_full;
  wire                logic_ptr_empty;
  reg        [2:0]    logic_ptr_push;
  reg        [2:0]    logic_ptr_pop;
  wire       [2:0]    logic_ptr_occupancy;
  wire       [2:0]    logic_ptr_popOnIo;
  wire                when_Stream_l1205;
  reg                 logic_ptr_wentUp;
  wire                io_push_fire;
  wire                logic_push_onRam_write_valid;
  wire       [1:0]    logic_push_onRam_write_payload_address;
  wire       [33:0]   logic_push_onRam_write_payload_data_address;
  wire       [7:0]    logic_push_onRam_write_payload_data_burstLen;
  wire                logic_pop_addressGen_valid;
  reg                 logic_pop_addressGen_ready;
  wire       [1:0]    logic_pop_addressGen_payload;
  wire                logic_pop_addressGen_fire;
  wire                logic_pop_sync_readArbitation_valid;
  wire                logic_pop_sync_readArbitation_ready;
  wire       [1:0]    logic_pop_sync_readArbitation_payload;
  reg                 logic_pop_addressGen_rValid;
  reg        [1:0]    logic_pop_addressGen_rData;
  wire                when_Stream_l369;
  wire                logic_pop_sync_readPort_cmd_valid;
  wire       [1:0]    logic_pop_sync_readPort_cmd_payload;
  wire       [33:0]   logic_pop_sync_readPort_rsp_address;
  wire       [7:0]    logic_pop_sync_readPort_rsp_burstLen;
  wire       [41:0]   _zz_logic_pop_sync_readPort_rsp_address;
  wire                logic_pop_sync_readArbitation_translated_valid;
  wire                logic_pop_sync_readArbitation_translated_ready;
  wire       [33:0]   logic_pop_sync_readArbitation_translated_payload_address;
  wire       [7:0]    logic_pop_sync_readArbitation_translated_payload_burstLen;
  wire                logic_pop_sync_readArbitation_fire;
  reg        [2:0]    logic_pop_sync_popReg;
  reg [41:0] logic_ram [0:3];

  assign _zz_logic_ram_port = {logic_push_onRam_write_payload_data_burstLen,logic_push_onRam_write_payload_data_address};
  always @(posedge clk) begin
    if(_zz_1) begin
      logic_ram[logic_push_onRam_write_payload_address] <= _zz_logic_ram_port;
    end
  end

  always @(posedge clk) begin
    if(logic_pop_sync_readPort_cmd_valid) begin
      _zz_logic_ram_port1 <= logic_ram[logic_pop_sync_readPort_cmd_payload];
    end
  end

  always @(*) begin
    _zz_1 = 1'b0;
    if(logic_push_onRam_write_valid) begin
      _zz_1 = 1'b1;
    end
  end

  assign when_Stream_l1205 = (logic_ptr_doPush != logic_ptr_doPop);
  assign logic_ptr_full = (((logic_ptr_push ^ logic_ptr_popOnIo) ^ 3'b100) == 3'b000);
  assign logic_ptr_empty = (logic_ptr_push == logic_ptr_pop);
  assign logic_ptr_occupancy = (logic_ptr_push - logic_ptr_popOnIo);
  assign io_push_ready = (! logic_ptr_full);
  assign io_push_fire = (io_push_valid && io_push_ready);
  assign logic_ptr_doPush = io_push_fire;
  assign logic_push_onRam_write_valid = io_push_fire;
  assign logic_push_onRam_write_payload_address = logic_ptr_push[1:0];
  assign logic_push_onRam_write_payload_data_address = io_push_payload_address;
  assign logic_push_onRam_write_payload_data_burstLen = io_push_payload_burstLen;
  assign logic_pop_addressGen_valid = (! logic_ptr_empty);
  assign logic_pop_addressGen_payload = logic_ptr_pop[1:0];
  assign logic_pop_addressGen_fire = (logic_pop_addressGen_valid && logic_pop_addressGen_ready);
  assign logic_ptr_doPop = logic_pop_addressGen_fire;
  always @(*) begin
    logic_pop_addressGen_ready = logic_pop_sync_readArbitation_ready;
    if(when_Stream_l369) begin
      logic_pop_addressGen_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! logic_pop_sync_readArbitation_valid);
  assign logic_pop_sync_readArbitation_valid = logic_pop_addressGen_rValid;
  assign logic_pop_sync_readArbitation_payload = logic_pop_addressGen_rData;
  assign _zz_logic_pop_sync_readPort_rsp_address = _zz_logic_ram_port1;
  assign logic_pop_sync_readPort_rsp_address = _zz_logic_pop_sync_readPort_rsp_address[33 : 0];
  assign logic_pop_sync_readPort_rsp_burstLen = _zz_logic_pop_sync_readPort_rsp_address[41 : 34];
  assign logic_pop_sync_readPort_cmd_valid = logic_pop_addressGen_fire;
  assign logic_pop_sync_readPort_cmd_payload = logic_pop_addressGen_payload;
  assign logic_pop_sync_readArbitation_translated_valid = logic_pop_sync_readArbitation_valid;
  assign logic_pop_sync_readArbitation_ready = logic_pop_sync_readArbitation_translated_ready;
  assign logic_pop_sync_readArbitation_translated_payload_address = logic_pop_sync_readPort_rsp_address;
  assign logic_pop_sync_readArbitation_translated_payload_burstLen = logic_pop_sync_readPort_rsp_burstLen;
  assign io_pop_valid = logic_pop_sync_readArbitation_translated_valid;
  assign logic_pop_sync_readArbitation_translated_ready = io_pop_ready;
  assign io_pop_payload_address = logic_pop_sync_readArbitation_translated_payload_address;
  assign io_pop_payload_burstLen = logic_pop_sync_readArbitation_translated_payload_burstLen;
  assign logic_pop_sync_readArbitation_fire = (logic_pop_sync_readArbitation_valid && logic_pop_sync_readArbitation_ready);
  assign logic_ptr_popOnIo = logic_pop_sync_popReg;
  assign io_occupancy = logic_ptr_occupancy;
  assign io_availability = (3'b100 - logic_ptr_occupancy);
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      logic_ptr_push <= 3'b000;
      logic_ptr_pop <= 3'b000;
      logic_ptr_wentUp <= 1'b0;
      logic_pop_addressGen_rValid <= 1'b0;
      logic_pop_sync_popReg <= 3'b000;
    end else begin
      if(when_Stream_l1205) begin
        logic_ptr_wentUp <= logic_ptr_doPush;
      end
      if(io_flush) begin
        logic_ptr_wentUp <= 1'b0;
      end
      if(logic_ptr_doPush) begin
        logic_ptr_push <= (logic_ptr_push + 3'b001);
      end
      if(logic_ptr_doPop) begin
        logic_ptr_pop <= (logic_ptr_pop + 3'b001);
      end
      if(io_flush) begin
        logic_ptr_push <= 3'b000;
        logic_ptr_pop <= 3'b000;
      end
      if(logic_pop_addressGen_ready) begin
        logic_pop_addressGen_rValid <= logic_pop_addressGen_valid;
      end
      if(io_flush) begin
        logic_pop_addressGen_rValid <= 1'b0;
      end
      if(logic_pop_sync_readArbitation_fire) begin
        logic_pop_sync_popReg <= logic_ptr_pop;
      end
      if(io_flush) begin
        logic_pop_sync_popReg <= 3'b000;
      end
    end
  end

  always @(posedge clk) begin
    if(logic_pop_addressGen_ready) begin
      logic_pop_addressGen_rData <= logic_pop_addressGen_payload;
    end
  end


endmodule

//MemRequestSlicer replaced by MemRequestSlicer_2

module StreamFifoCCIfNecessary (
  input  wire          io_push_valid,
  output wire          io_push_ready,
  input  wire          io_push_payload_last,
  input  wire [511:0]  io_push_payload_fragment_data,
  input  wire [63:0]   io_push_payload_fragment_strb,
  output wire          io_pop_valid,
  input  wire          io_pop_ready,
  output wire          io_pop_payload_last,
  output wire [511:0]  io_pop_payload_fragment_data,
  output wire [63:0]   io_pop_payload_fragment_strb,
  output wire [6:0]    io_pushOccupancy,
  output wire [6:0]    io_popOccupancy,
  input  wire          clk,
  input  wire          reset
);

  wire                impl_inst_io_flush;
  wire                impl_inst_io_push_ready;
  wire                impl_inst_io_pop_valid;
  wire                impl_inst_io_pop_payload_last;
  wire       [511:0]  impl_inst_io_pop_payload_fragment_data;
  wire       [63:0]   impl_inst_io_pop_payload_fragment_strb;
  wire       [6:0]    impl_inst_io_occupancy;
  wire       [6:0]    impl_inst_io_availability;

  StreamFifo_7 impl_inst (
    .io_push_valid                 (io_push_valid                                ), //i
    .io_push_ready                 (impl_inst_io_push_ready                      ), //o
    .io_push_payload_last          (io_push_payload_last                         ), //i
    .io_push_payload_fragment_data (io_push_payload_fragment_data[511:0]         ), //i
    .io_push_payload_fragment_strb (io_push_payload_fragment_strb[63:0]          ), //i
    .io_pop_valid                  (impl_inst_io_pop_valid                       ), //o
    .io_pop_ready                  (io_pop_ready                                 ), //i
    .io_pop_payload_last           (impl_inst_io_pop_payload_last                ), //o
    .io_pop_payload_fragment_data  (impl_inst_io_pop_payload_fragment_data[511:0]), //o
    .io_pop_payload_fragment_strb  (impl_inst_io_pop_payload_fragment_strb[63:0] ), //o
    .io_flush                      (impl_inst_io_flush                           ), //i
    .io_occupancy                  (impl_inst_io_occupancy[6:0]                  ), //o
    .io_availability               (impl_inst_io_availability[6:0]               ), //o
    .clk                           (clk                                          ), //i
    .reset                         (reset                                        )  //i
  );
  assign io_push_ready = impl_inst_io_push_ready;
  assign io_pop_valid = impl_inst_io_pop_valid;
  assign io_pop_payload_last = impl_inst_io_pop_payload_last;
  assign io_pop_payload_fragment_data = impl_inst_io_pop_payload_fragment_data;
  assign io_pop_payload_fragment_strb = impl_inst_io_pop_payload_fragment_strb;
  assign io_pushOccupancy = impl_inst_io_occupancy;
  assign io_popOccupancy = impl_inst_io_occupancy;
  assign impl_inst_io_flush = 1'b0;

endmodule

module StreamCCByToggle_2 (
  input  wire          io_input_valid,
  output wire          io_input_ready,
  input  wire [33:0]   io_input_payload_address,
  input  wire [7:0]    io_input_payload_burstLen,
  output wire          io_output_valid,
  input  wire          io_output_ready,
  output wire [33:0]   io_output_payload_address,
  output wire [7:0]    io_output_payload_burstLen,
  input  wire          clk,
  input  wire          reset,
  input  wire          reset_syncronized
);

  wire                outHitSignal_buffercc_io_dataOut;
  wire                pushArea_target_buffercc_io_dataOut;
  wire                outHitSignal;
  wire                pushArea_hit;
  wire                pushArea_accept;
  reg                 pushArea_target;
  reg        [33:0]   pushArea_data_address;
  reg        [7:0]    pushArea_data_burstLen;
  wire                io_input_fire;
  wire                popArea_stream_valid;
  reg                 popArea_stream_ready;
  wire       [33:0]   popArea_stream_payload_address;
  wire       [7:0]    popArea_stream_payload_burstLen;
  wire                popArea_target;
  wire                popArea_stream_fire;
  reg                 popArea_hit;
  wire                popArea_stream_m2sPipe_valid;
  wire                popArea_stream_m2sPipe_ready;
  wire       [33:0]   popArea_stream_m2sPipe_payload_address;
  wire       [7:0]    popArea_stream_m2sPipe_payload_burstLen;
  reg                 popArea_stream_rValid;
  (* async_reg = "true" *) reg        [33:0]   popArea_stream_rData_address;
  (* async_reg = "true" *) reg        [7:0]    popArea_stream_rData_burstLen;
  wire                when_Stream_l369;

  BufferCC_6 outHitSignal_buffercc (
    .io_dataIn  (outHitSignal                    ), //i
    .io_dataOut (outHitSignal_buffercc_io_dataOut), //o
    .clk        (clk                             ), //i
    .reset      (reset                           )  //i
  );
  BufferCC_8 pushArea_target_buffercc (
    .io_dataIn         (pushArea_target                    ), //i
    .io_dataOut        (pushArea_target_buffercc_io_dataOut), //o
    .clk               (clk                                ), //i
    .reset_syncronized (reset_syncronized                  )  //i
  );
  assign pushArea_hit = outHitSignal_buffercc_io_dataOut;
  assign io_input_fire = (io_input_valid && io_input_ready);
  assign pushArea_accept = io_input_fire;
  assign io_input_ready = (pushArea_hit == pushArea_target);
  assign popArea_target = pushArea_target_buffercc_io_dataOut;
  assign popArea_stream_fire = (popArea_stream_valid && popArea_stream_ready);
  assign outHitSignal = popArea_hit;
  assign popArea_stream_valid = (popArea_target != popArea_hit);
  assign popArea_stream_payload_address = pushArea_data_address;
  assign popArea_stream_payload_burstLen = pushArea_data_burstLen;
  always @(*) begin
    popArea_stream_ready = popArea_stream_m2sPipe_ready;
    if(when_Stream_l369) begin
      popArea_stream_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! popArea_stream_m2sPipe_valid);
  assign popArea_stream_m2sPipe_valid = popArea_stream_rValid;
  assign popArea_stream_m2sPipe_payload_address = popArea_stream_rData_address;
  assign popArea_stream_m2sPipe_payload_burstLen = popArea_stream_rData_burstLen;
  assign io_output_valid = popArea_stream_m2sPipe_valid;
  assign popArea_stream_m2sPipe_ready = io_output_ready;
  assign io_output_payload_address = popArea_stream_m2sPipe_payload_address;
  assign io_output_payload_burstLen = popArea_stream_m2sPipe_payload_burstLen;
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      pushArea_target <= 1'b0;
    end else begin
      if(pushArea_accept) begin
        pushArea_target <= (! pushArea_target);
      end
    end
  end

  always @(posedge clk) begin
    if(pushArea_accept) begin
      pushArea_data_address <= io_input_payload_address;
      pushArea_data_burstLen <= io_input_payload_burstLen;
    end
  end

  always @(posedge clk or posedge reset_syncronized) begin
    if(reset_syncronized) begin
      popArea_hit <= 1'b0;
      popArea_stream_rValid <= 1'b0;
    end else begin
      if(popArea_stream_fire) begin
        popArea_hit <= popArea_target;
      end
      if(popArea_stream_ready) begin
        popArea_stream_rValid <= popArea_stream_valid;
      end
    end
  end

  always @(posedge clk) begin
    if(popArea_stream_fire) begin
      popArea_stream_rData_address <= popArea_stream_payload_address;
      popArea_stream_rData_burstLen <= popArea_stream_payload_burstLen;
    end
  end


endmodule

//MemRequestSlicer_1 replaced by MemRequestSlicer_2

//StreamFifoCCIfNecessary_1 replaced by StreamFifoCCIfNecessary_2

module StreamCCByToggle_3 (
  input  wire          io_input_valid,
  output wire          io_input_ready,
  input  wire [33:0]   io_input_payload_address,
  input  wire [7:0]    io_input_payload_burstLen,
  output wire          io_output_valid,
  input  wire          io_output_ready,
  output wire [33:0]   io_output_payload_address,
  output wire [7:0]    io_output_payload_burstLen,
  input  wire          clk,
  input  wire          reset,
  output wire          reset_syncronized_1
);

  wire                bufferCC_9_io_dataIn;
  wire                outHitSignal_buffercc_io_dataOut;
  wire                bufferCC_9_io_dataOut;
  wire                pushArea_target_buffercc_io_dataOut;
  wire                outHitSignal;
  wire                pushArea_hit;
  wire                pushArea_accept;
  reg                 pushArea_target;
  reg        [33:0]   pushArea_data_address;
  reg        [7:0]    pushArea_data_burstLen;
  wire                io_input_fire;
  wire                reset_syncronized;
  wire                popArea_stream_valid;
  reg                 popArea_stream_ready;
  wire       [33:0]   popArea_stream_payload_address;
  wire       [7:0]    popArea_stream_payload_burstLen;
  wire                popArea_target;
  wire                popArea_stream_fire;
  reg                 popArea_hit;
  wire                popArea_stream_m2sPipe_valid;
  wire                popArea_stream_m2sPipe_ready;
  wire       [33:0]   popArea_stream_m2sPipe_payload_address;
  wire       [7:0]    popArea_stream_m2sPipe_payload_burstLen;
  reg                 popArea_stream_rValid;
  (* async_reg = "true" *) reg        [33:0]   popArea_stream_rData_address;
  (* async_reg = "true" *) reg        [7:0]    popArea_stream_rData_burstLen;
  wire                when_Stream_l369;

  BufferCC_6 outHitSignal_buffercc (
    .io_dataIn  (outHitSignal                    ), //i
    .io_dataOut (outHitSignal_buffercc_io_dataOut), //o
    .clk        (clk                             ), //i
    .reset      (reset                           )  //i
  );
  BufferCC_7 bufferCC_9 (
    .io_dataIn  (bufferCC_9_io_dataIn ), //i
    .io_dataOut (bufferCC_9_io_dataOut), //o
    .clk        (clk                  ), //i
    .reset      (reset                )  //i
  );
  BufferCC_8 pushArea_target_buffercc (
    .io_dataIn         (pushArea_target                    ), //i
    .io_dataOut        (pushArea_target_buffercc_io_dataOut), //o
    .clk               (clk                                ), //i
    .reset_syncronized (reset_syncronized                  )  //i
  );
  assign pushArea_hit = outHitSignal_buffercc_io_dataOut;
  assign io_input_fire = (io_input_valid && io_input_ready);
  assign pushArea_accept = io_input_fire;
  assign io_input_ready = (pushArea_hit == pushArea_target);
  assign bufferCC_9_io_dataIn = (1'b0 ^ 1'b0);
  assign reset_syncronized = bufferCC_9_io_dataOut;
  assign popArea_target = pushArea_target_buffercc_io_dataOut;
  assign popArea_stream_fire = (popArea_stream_valid && popArea_stream_ready);
  assign outHitSignal = popArea_hit;
  assign popArea_stream_valid = (popArea_target != popArea_hit);
  assign popArea_stream_payload_address = pushArea_data_address;
  assign popArea_stream_payload_burstLen = pushArea_data_burstLen;
  always @(*) begin
    popArea_stream_ready = popArea_stream_m2sPipe_ready;
    if(when_Stream_l369) begin
      popArea_stream_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! popArea_stream_m2sPipe_valid);
  assign popArea_stream_m2sPipe_valid = popArea_stream_rValid;
  assign popArea_stream_m2sPipe_payload_address = popArea_stream_rData_address;
  assign popArea_stream_m2sPipe_payload_burstLen = popArea_stream_rData_burstLen;
  assign io_output_valid = popArea_stream_m2sPipe_valid;
  assign popArea_stream_m2sPipe_ready = io_output_ready;
  assign io_output_payload_address = popArea_stream_m2sPipe_payload_address;
  assign io_output_payload_burstLen = popArea_stream_m2sPipe_payload_burstLen;
  assign reset_syncronized_1 = reset_syncronized;
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      pushArea_target <= 1'b0;
    end else begin
      if(pushArea_accept) begin
        pushArea_target <= (! pushArea_target);
      end
    end
  end

  always @(posedge clk) begin
    if(pushArea_accept) begin
      pushArea_data_address <= io_input_payload_address;
      pushArea_data_burstLen <= io_input_payload_burstLen;
    end
  end

  always @(posedge clk or posedge reset_syncronized) begin
    if(reset_syncronized) begin
      popArea_hit <= 1'b0;
      popArea_stream_rValid <= 1'b0;
    end else begin
      if(popArea_stream_fire) begin
        popArea_hit <= popArea_target;
      end
      if(popArea_stream_ready) begin
        popArea_stream_rValid <= popArea_stream_valid;
      end
    end
  end

  always @(posedge clk) begin
    if(popArea_stream_fire) begin
      popArea_stream_rData_address <= popArea_stream_payload_address;
      popArea_stream_rData_burstLen <= popArea_stream_payload_burstLen;
    end
  end


endmodule

module MemRequestSlicer_2 (
  input  wire          io_input_valid,
  output reg           io_input_ready,
  input  wire [33:0]   io_input_payload_address,
  input  wire [33:0]   io_input_payload_burstLen,
  output wire          io_output_valid,
  input  wire          io_output_ready,
  output wire [33:0]   io_output_payload_address,
  output wire [7:0]    io_output_payload_burstLen,
  output wire          io_isLast_valid,
  output wire          io_isLast_payload,
  input  wire          clk,
  input  wire          reset
);

  wire       [33:0]   _zz_isLast;
  wire       [27:0]   _zz__zz_addr;
  wire       [27:0]   _zz__zz_addr_1;
  wire       [33:0]   _zz__zz_burstLeft;
  wire       [33:0]   _zz__zz_burstLeft_1;
  wire       [5:0]    _zz__zz_io_output_payload_burstLen_3;
  wire       [5:0]    _zz_io_output_payload_burstLen_4;
  wire       [5:0]    _zz_io_output_payload_burstLen_5;
  wire       [5:0]    _zz_io_output_payload_burstLen_6;
  wire                input_valid;
  wire                input_ready;
  wire       [33:0]   input_payload_address;
  wire       [33:0]   input_payload_burstLen;
  reg                 io_input_rValid;
  reg        [33:0]   io_input_rData_address;
  reg        [33:0]   io_input_rData_burstLen;
  wire                when_Stream_l369;
  reg                 isFirst;
  wire       [27:0]   addr;
  wire       [33:0]   burstLeft;
  wire                isLast;
  wire                io_output_fire;
  reg        [27:0]   _zz_addr;
  reg        [33:0]   _zz_burstLeft;
  wire       [3:0]    _zz_io_output_payload_burstLen;
  wire       [3:0]    _zz_io_output_payload_burstLen_1;
  wire       [3:0]    _zz_io_output_payload_burstLen_2;
  wire       [5:0]    _zz_io_output_payload_burstLen_3;
  wire                input_fire;

  assign _zz_isLast = {26'd0, io_output_payload_burstLen};
  assign _zz__zz_addr = (addr + _zz__zz_addr_1);
  assign _zz__zz_addr_1 = {20'd0, io_output_payload_burstLen};
  assign _zz__zz_burstLeft = (burstLeft - _zz__zz_burstLeft_1);
  assign _zz__zz_burstLeft_1 = {26'd0, io_output_payload_burstLen};
  assign _zz__zz_io_output_payload_burstLen_3 = addr[5:0];
  assign _zz_io_output_payload_burstLen_4 = ((_zz_io_output_payload_burstLen_5 < _zz_io_output_payload_burstLen_3) ? _zz_io_output_payload_burstLen_6 : _zz_io_output_payload_burstLen_3);
  assign _zz_io_output_payload_burstLen_5 = {2'd0, _zz_io_output_payload_burstLen_2};
  assign _zz_io_output_payload_burstLen_6 = {2'd0, _zz_io_output_payload_burstLen_2};
  always @(*) begin
    io_input_ready = input_ready;
    if(when_Stream_l369) begin
      io_input_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! input_valid);
  assign input_valid = io_input_rValid;
  assign input_payload_address = io_input_rData_address;
  assign input_payload_burstLen = io_input_rData_burstLen;
  assign isLast = (burstLeft == _zz_isLast);
  assign io_output_fire = (io_output_valid && io_output_ready);
  assign addr = (isFirst ? input_payload_address[33 : 6] : _zz_addr);
  assign burstLeft = (isFirst ? input_payload_burstLen : _zz_burstLeft);
  assign io_output_payload_address = {addr,6'h00};
  assign _zz_io_output_payload_burstLen = burstLeft[3:0];
  assign _zz_io_output_payload_burstLen_1 = 4'b1111;
  assign _zz_io_output_payload_burstLen_2 = ((_zz_io_output_payload_burstLen < _zz_io_output_payload_burstLen_1) ? _zz_io_output_payload_burstLen : _zz_io_output_payload_burstLen_1);
  assign _zz_io_output_payload_burstLen_3 = (6'h3f - _zz__zz_io_output_payload_burstLen_3);
  assign io_output_payload_burstLen = {2'd0, _zz_io_output_payload_burstLen_4};
  assign io_output_valid = input_valid;
  assign input_ready = (io_output_ready && isLast);
  assign input_fire = (input_valid && input_ready);
  assign io_isLast_valid = io_output_fire;
  assign io_isLast_payload = isLast;
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      io_input_rValid <= 1'b0;
      isFirst <= 1'b1;
    end else begin
      if(io_input_ready) begin
        io_input_rValid <= io_input_valid;
      end
      if(io_output_fire) begin
        isFirst <= 1'b0;
      end
      if(input_fire) begin
        isFirst <= 1'b1;
      end
    end
  end

  always @(posedge clk) begin
    if(io_input_ready) begin
      io_input_rData_address <= io_input_payload_address;
      io_input_rData_burstLen <= io_input_payload_burstLen;
    end
    if(io_output_fire) begin
      _zz_addr <= (_zz__zz_addr + 28'h0000001);
    end
    if(io_output_fire) begin
      _zz_burstLeft <= (_zz__zz_burstLeft - 34'h000000001);
    end
  end


endmodule

module StreamFifoCCIfNecessary_2 (
  input  wire          io_push_valid,
  output wire          io_push_ready,
  input  wire [511:0]  io_push_payload,
  output wire          io_pop_valid,
  input  wire          io_pop_ready,
  output wire [511:0]  io_pop_payload,
  output wire [6:0]    io_pushOccupancy,
  output wire [6:0]    io_popOccupancy,
  input  wire          clk,
  input  wire          reset
);

  wire                impl_inst_io_flush;
  wire                impl_inst_io_push_ready;
  wire                impl_inst_io_pop_valid;
  wire       [511:0]  impl_inst_io_pop_payload;
  wire       [6:0]    impl_inst_io_occupancy;
  wire       [6:0]    impl_inst_io_availability;

  StreamFifo_9 impl_inst (
    .io_push_valid   (io_push_valid                  ), //i
    .io_push_ready   (impl_inst_io_push_ready        ), //o
    .io_push_payload (io_push_payload[511:0]         ), //i
    .io_pop_valid    (impl_inst_io_pop_valid         ), //o
    .io_pop_ready    (io_pop_ready                   ), //i
    .io_pop_payload  (impl_inst_io_pop_payload[511:0]), //o
    .io_flush        (impl_inst_io_flush             ), //i
    .io_occupancy    (impl_inst_io_occupancy[6:0]    ), //o
    .io_availability (impl_inst_io_availability[6:0] ), //o
    .clk             (clk                            ), //i
    .reset           (reset                          )  //i
  );
  assign io_push_ready = impl_inst_io_push_ready;
  assign io_pop_valid = impl_inst_io_pop_valid;
  assign io_pop_payload = impl_inst_io_pop_payload;
  assign io_pushOccupancy = impl_inst_io_occupancy;
  assign io_popOccupancy = impl_inst_io_occupancy;
  assign impl_inst_io_flush = 1'b0;

endmodule

//BufferCC_1 replaced by BufferCC_8

//BufferCC replaced by BufferCC_6

//BufferCC_3 replaced by BufferCC_8

//BufferCC_2 replaced by BufferCC_6

module StreamFifo_7 (
  input  wire          io_push_valid,
  output wire          io_push_ready,
  input  wire          io_push_payload_last,
  input  wire [511:0]  io_push_payload_fragment_data,
  input  wire [63:0]   io_push_payload_fragment_strb,
  output wire          io_pop_valid,
  input  wire          io_pop_ready,
  output wire          io_pop_payload_last,
  output wire [511:0]  io_pop_payload_fragment_data,
  output wire [63:0]   io_pop_payload_fragment_strb,
  input  wire          io_flush,
  output wire [6:0]    io_occupancy,
  output wire [6:0]    io_availability,
  input  wire          clk,
  input  wire          reset
);

  reg        [576:0]  _zz_logic_ram_port1;
  wire       [576:0]  _zz_logic_ram_port;
  reg                 _zz_1;
  wire                logic_ptr_doPush;
  wire                logic_ptr_doPop;
  wire                logic_ptr_full;
  wire                logic_ptr_empty;
  reg        [6:0]    logic_ptr_push;
  reg        [6:0]    logic_ptr_pop;
  wire       [6:0]    logic_ptr_occupancy;
  wire       [6:0]    logic_ptr_popOnIo;
  wire                when_Stream_l1205;
  reg                 logic_ptr_wentUp;
  wire                io_push_fire;
  wire                logic_push_onRam_write_valid;
  wire       [5:0]    logic_push_onRam_write_payload_address;
  wire                logic_push_onRam_write_payload_data_last;
  wire       [511:0]  logic_push_onRam_write_payload_data_fragment_data;
  wire       [63:0]   logic_push_onRam_write_payload_data_fragment_strb;
  wire                logic_pop_addressGen_valid;
  reg                 logic_pop_addressGen_ready;
  wire       [5:0]    logic_pop_addressGen_payload;
  wire                logic_pop_addressGen_fire;
  wire                logic_pop_sync_readArbitation_valid;
  wire                logic_pop_sync_readArbitation_ready;
  wire       [5:0]    logic_pop_sync_readArbitation_payload;
  reg                 logic_pop_addressGen_rValid;
  reg        [5:0]    logic_pop_addressGen_rData;
  wire                when_Stream_l369;
  wire                logic_pop_sync_readPort_cmd_valid;
  wire       [5:0]    logic_pop_sync_readPort_cmd_payload;
  wire                logic_pop_sync_readPort_rsp_last;
  wire       [511:0]  logic_pop_sync_readPort_rsp_fragment_data;
  wire       [63:0]   logic_pop_sync_readPort_rsp_fragment_strb;
  wire       [576:0]  _zz_logic_pop_sync_readPort_rsp_last;
  wire       [575:0]  _zz_logic_pop_sync_readPort_rsp_fragment_data;
  wire                logic_pop_sync_readArbitation_translated_valid;
  wire                logic_pop_sync_readArbitation_translated_ready;
  wire                logic_pop_sync_readArbitation_translated_payload_last;
  wire       [511:0]  logic_pop_sync_readArbitation_translated_payload_fragment_data;
  wire       [63:0]   logic_pop_sync_readArbitation_translated_payload_fragment_strb;
  wire                logic_pop_sync_readArbitation_fire;
  reg        [6:0]    logic_pop_sync_popReg;
  reg [576:0] logic_ram [0:63];

  assign _zz_logic_ram_port = {{logic_push_onRam_write_payload_data_fragment_strb,logic_push_onRam_write_payload_data_fragment_data},logic_push_onRam_write_payload_data_last};
  always @(posedge clk) begin
    if(_zz_1) begin
      logic_ram[logic_push_onRam_write_payload_address] <= _zz_logic_ram_port;
    end
  end

  always @(posedge clk) begin
    if(logic_pop_sync_readPort_cmd_valid) begin
      _zz_logic_ram_port1 <= logic_ram[logic_pop_sync_readPort_cmd_payload];
    end
  end

  always @(*) begin
    _zz_1 = 1'b0;
    if(logic_push_onRam_write_valid) begin
      _zz_1 = 1'b1;
    end
  end

  assign when_Stream_l1205 = (logic_ptr_doPush != logic_ptr_doPop);
  assign logic_ptr_full = (((logic_ptr_push ^ logic_ptr_popOnIo) ^ 7'h40) == 7'h00);
  assign logic_ptr_empty = (logic_ptr_push == logic_ptr_pop);
  assign logic_ptr_occupancy = (logic_ptr_push - logic_ptr_popOnIo);
  assign io_push_ready = (! logic_ptr_full);
  assign io_push_fire = (io_push_valid && io_push_ready);
  assign logic_ptr_doPush = io_push_fire;
  assign logic_push_onRam_write_valid = io_push_fire;
  assign logic_push_onRam_write_payload_address = logic_ptr_push[5:0];
  assign logic_push_onRam_write_payload_data_last = io_push_payload_last;
  assign logic_push_onRam_write_payload_data_fragment_data = io_push_payload_fragment_data;
  assign logic_push_onRam_write_payload_data_fragment_strb = io_push_payload_fragment_strb;
  assign logic_pop_addressGen_valid = (! logic_ptr_empty);
  assign logic_pop_addressGen_payload = logic_ptr_pop[5:0];
  assign logic_pop_addressGen_fire = (logic_pop_addressGen_valid && logic_pop_addressGen_ready);
  assign logic_ptr_doPop = logic_pop_addressGen_fire;
  always @(*) begin
    logic_pop_addressGen_ready = logic_pop_sync_readArbitation_ready;
    if(when_Stream_l369) begin
      logic_pop_addressGen_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! logic_pop_sync_readArbitation_valid);
  assign logic_pop_sync_readArbitation_valid = logic_pop_addressGen_rValid;
  assign logic_pop_sync_readArbitation_payload = logic_pop_addressGen_rData;
  assign _zz_logic_pop_sync_readPort_rsp_last = _zz_logic_ram_port1;
  assign _zz_logic_pop_sync_readPort_rsp_fragment_data = _zz_logic_pop_sync_readPort_rsp_last[576 : 1];
  assign logic_pop_sync_readPort_rsp_last = _zz_logic_pop_sync_readPort_rsp_last[0];
  assign logic_pop_sync_readPort_rsp_fragment_data = _zz_logic_pop_sync_readPort_rsp_fragment_data[511 : 0];
  assign logic_pop_sync_readPort_rsp_fragment_strb = _zz_logic_pop_sync_readPort_rsp_fragment_data[575 : 512];
  assign logic_pop_sync_readPort_cmd_valid = logic_pop_addressGen_fire;
  assign logic_pop_sync_readPort_cmd_payload = logic_pop_addressGen_payload;
  assign logic_pop_sync_readArbitation_translated_valid = logic_pop_sync_readArbitation_valid;
  assign logic_pop_sync_readArbitation_ready = logic_pop_sync_readArbitation_translated_ready;
  assign logic_pop_sync_readArbitation_translated_payload_last = logic_pop_sync_readPort_rsp_last;
  assign logic_pop_sync_readArbitation_translated_payload_fragment_data = logic_pop_sync_readPort_rsp_fragment_data;
  assign logic_pop_sync_readArbitation_translated_payload_fragment_strb = logic_pop_sync_readPort_rsp_fragment_strb;
  assign io_pop_valid = logic_pop_sync_readArbitation_translated_valid;
  assign logic_pop_sync_readArbitation_translated_ready = io_pop_ready;
  assign io_pop_payload_last = logic_pop_sync_readArbitation_translated_payload_last;
  assign io_pop_payload_fragment_data = logic_pop_sync_readArbitation_translated_payload_fragment_data;
  assign io_pop_payload_fragment_strb = logic_pop_sync_readArbitation_translated_payload_fragment_strb;
  assign logic_pop_sync_readArbitation_fire = (logic_pop_sync_readArbitation_valid && logic_pop_sync_readArbitation_ready);
  assign logic_ptr_popOnIo = logic_pop_sync_popReg;
  assign io_occupancy = logic_ptr_occupancy;
  assign io_availability = (7'h40 - logic_ptr_occupancy);
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      logic_ptr_push <= 7'h00;
      logic_ptr_pop <= 7'h00;
      logic_ptr_wentUp <= 1'b0;
      logic_pop_addressGen_rValid <= 1'b0;
      logic_pop_sync_popReg <= 7'h00;
    end else begin
      if(when_Stream_l1205) begin
        logic_ptr_wentUp <= logic_ptr_doPush;
      end
      if(io_flush) begin
        logic_ptr_wentUp <= 1'b0;
      end
      if(logic_ptr_doPush) begin
        logic_ptr_push <= (logic_ptr_push + 7'h01);
      end
      if(logic_ptr_doPop) begin
        logic_ptr_pop <= (logic_ptr_pop + 7'h01);
      end
      if(io_flush) begin
        logic_ptr_push <= 7'h00;
        logic_ptr_pop <= 7'h00;
      end
      if(logic_pop_addressGen_ready) begin
        logic_pop_addressGen_rValid <= logic_pop_addressGen_valid;
      end
      if(io_flush) begin
        logic_pop_addressGen_rValid <= 1'b0;
      end
      if(logic_pop_sync_readArbitation_fire) begin
        logic_pop_sync_popReg <= logic_ptr_pop;
      end
      if(io_flush) begin
        logic_pop_sync_popReg <= 7'h00;
      end
    end
  end

  always @(posedge clk) begin
    if(logic_pop_addressGen_ready) begin
      logic_pop_addressGen_rData <= logic_pop_addressGen_payload;
    end
  end


endmodule

//BufferCC_5 replaced by BufferCC_8

//BufferCC_4 replaced by BufferCC_6

//StreamFifo_8 replaced by StreamFifo_9

module BufferCC_8 (
  input  wire          io_dataIn,
  output wire          io_dataOut,
  input  wire          clk,
  input  wire          reset_syncronized
);

  (* async_reg = "true" *) reg                 buffers_0;
  (* async_reg = "true" *) reg                 buffers_1;

  assign io_dataOut = buffers_1;
  always @(posedge clk or posedge reset_syncronized) begin
    if(reset_syncronized) begin
      buffers_0 <= 1'b0;
      buffers_1 <= 1'b0;
    end else begin
      buffers_0 <= io_dataIn;
      buffers_1 <= buffers_0;
    end
  end


endmodule

module BufferCC_7 (
  input  wire          io_dataIn,
  output wire          io_dataOut,
  input  wire          clk,
  input  wire          reset
);

  (* async_reg = "true" *) reg                 buffers_0;
  (* async_reg = "true" *) reg                 buffers_1;

  assign io_dataOut = buffers_1;
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      buffers_0 <= 1'b1;
      buffers_1 <= 1'b1;
    end else begin
      buffers_0 <= io_dataIn;
      buffers_1 <= buffers_0;
    end
  end


endmodule

module BufferCC_6 (
  input  wire          io_dataIn,
  output wire          io_dataOut,
  input  wire          clk,
  input  wire          reset
);

  (* async_reg = "true" *) reg                 buffers_0;
  (* async_reg = "true" *) reg                 buffers_1;

  assign io_dataOut = buffers_1;
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      buffers_0 <= 1'b0;
      buffers_1 <= 1'b0;
    end else begin
      buffers_0 <= io_dataIn;
      buffers_1 <= buffers_0;
    end
  end


endmodule

module StreamFifo_9 (
  input  wire          io_push_valid,
  output wire          io_push_ready,
  input  wire [511:0]  io_push_payload,
  output wire          io_pop_valid,
  input  wire          io_pop_ready,
  output wire [511:0]  io_pop_payload,
  input  wire          io_flush,
  output wire [6:0]    io_occupancy,
  output wire [6:0]    io_availability,
  input  wire          clk,
  input  wire          reset
);

  reg        [511:0]  _zz_logic_ram_port1;
  reg                 _zz_1;
  wire                logic_ptr_doPush;
  wire                logic_ptr_doPop;
  wire                logic_ptr_full;
  wire                logic_ptr_empty;
  reg        [6:0]    logic_ptr_push;
  reg        [6:0]    logic_ptr_pop;
  wire       [6:0]    logic_ptr_occupancy;
  wire       [6:0]    logic_ptr_popOnIo;
  wire                when_Stream_l1205;
  reg                 logic_ptr_wentUp;
  wire                io_push_fire;
  wire                logic_push_onRam_write_valid;
  wire       [5:0]    logic_push_onRam_write_payload_address;
  wire       [511:0]  logic_push_onRam_write_payload_data;
  wire                logic_pop_addressGen_valid;
  reg                 logic_pop_addressGen_ready;
  wire       [5:0]    logic_pop_addressGen_payload;
  wire                logic_pop_addressGen_fire;
  wire                logic_pop_sync_readArbitation_valid;
  wire                logic_pop_sync_readArbitation_ready;
  wire       [5:0]    logic_pop_sync_readArbitation_payload;
  reg                 logic_pop_addressGen_rValid;
  reg        [5:0]    logic_pop_addressGen_rData;
  wire                when_Stream_l369;
  wire                logic_pop_sync_readPort_cmd_valid;
  wire       [5:0]    logic_pop_sync_readPort_cmd_payload;
  wire       [511:0]  logic_pop_sync_readPort_rsp;
  wire                logic_pop_sync_readArbitation_translated_valid;
  wire                logic_pop_sync_readArbitation_translated_ready;
  wire       [511:0]  logic_pop_sync_readArbitation_translated_payload;
  wire                logic_pop_sync_readArbitation_fire;
  reg        [6:0]    logic_pop_sync_popReg;
  reg [511:0] logic_ram [0:63];

  always @(posedge clk) begin
    if(_zz_1) begin
      logic_ram[logic_push_onRam_write_payload_address] <= logic_push_onRam_write_payload_data;
    end
  end

  always @(posedge clk) begin
    if(logic_pop_sync_readPort_cmd_valid) begin
      _zz_logic_ram_port1 <= logic_ram[logic_pop_sync_readPort_cmd_payload];
    end
  end

  always @(*) begin
    _zz_1 = 1'b0;
    if(logic_push_onRam_write_valid) begin
      _zz_1 = 1'b1;
    end
  end

  assign when_Stream_l1205 = (logic_ptr_doPush != logic_ptr_doPop);
  assign logic_ptr_full = (((logic_ptr_push ^ logic_ptr_popOnIo) ^ 7'h40) == 7'h00);
  assign logic_ptr_empty = (logic_ptr_push == logic_ptr_pop);
  assign logic_ptr_occupancy = (logic_ptr_push - logic_ptr_popOnIo);
  assign io_push_ready = (! logic_ptr_full);
  assign io_push_fire = (io_push_valid && io_push_ready);
  assign logic_ptr_doPush = io_push_fire;
  assign logic_push_onRam_write_valid = io_push_fire;
  assign logic_push_onRam_write_payload_address = logic_ptr_push[5:0];
  assign logic_push_onRam_write_payload_data = io_push_payload;
  assign logic_pop_addressGen_valid = (! logic_ptr_empty);
  assign logic_pop_addressGen_payload = logic_ptr_pop[5:0];
  assign logic_pop_addressGen_fire = (logic_pop_addressGen_valid && logic_pop_addressGen_ready);
  assign logic_ptr_doPop = logic_pop_addressGen_fire;
  always @(*) begin
    logic_pop_addressGen_ready = logic_pop_sync_readArbitation_ready;
    if(when_Stream_l369) begin
      logic_pop_addressGen_ready = 1'b1;
    end
  end

  assign when_Stream_l369 = (! logic_pop_sync_readArbitation_valid);
  assign logic_pop_sync_readArbitation_valid = logic_pop_addressGen_rValid;
  assign logic_pop_sync_readArbitation_payload = logic_pop_addressGen_rData;
  assign logic_pop_sync_readPort_rsp = _zz_logic_ram_port1;
  assign logic_pop_sync_readPort_cmd_valid = logic_pop_addressGen_fire;
  assign logic_pop_sync_readPort_cmd_payload = logic_pop_addressGen_payload;
  assign logic_pop_sync_readArbitation_translated_valid = logic_pop_sync_readArbitation_valid;
  assign logic_pop_sync_readArbitation_ready = logic_pop_sync_readArbitation_translated_ready;
  assign logic_pop_sync_readArbitation_translated_payload = logic_pop_sync_readPort_rsp;
  assign io_pop_valid = logic_pop_sync_readArbitation_translated_valid;
  assign logic_pop_sync_readArbitation_translated_ready = io_pop_ready;
  assign io_pop_payload = logic_pop_sync_readArbitation_translated_payload;
  assign logic_pop_sync_readArbitation_fire = (logic_pop_sync_readArbitation_valid && logic_pop_sync_readArbitation_ready);
  assign logic_ptr_popOnIo = logic_pop_sync_popReg;
  assign io_occupancy = logic_ptr_occupancy;
  assign io_availability = (7'h40 - logic_ptr_occupancy);
  always @(posedge clk or posedge reset) begin
    if(reset) begin
      logic_ptr_push <= 7'h00;
      logic_ptr_pop <= 7'h00;
      logic_ptr_wentUp <= 1'b0;
      logic_pop_addressGen_rValid <= 1'b0;
      logic_pop_sync_popReg <= 7'h00;
    end else begin
      if(when_Stream_l1205) begin
        logic_ptr_wentUp <= logic_ptr_doPush;
      end
      if(io_flush) begin
        logic_ptr_wentUp <= 1'b0;
      end
      if(logic_ptr_doPush) begin
        logic_ptr_push <= (logic_ptr_push + 7'h01);
      end
      if(logic_ptr_doPop) begin
        logic_ptr_pop <= (logic_ptr_pop + 7'h01);
      end
      if(io_flush) begin
        logic_ptr_push <= 7'h00;
        logic_ptr_pop <= 7'h00;
      end
      if(logic_pop_addressGen_ready) begin
        logic_pop_addressGen_rValid <= logic_pop_addressGen_valid;
      end
      if(io_flush) begin
        logic_pop_addressGen_rValid <= 1'b0;
      end
      if(logic_pop_sync_readArbitation_fire) begin
        logic_pop_sync_popReg <= logic_ptr_pop;
      end
      if(io_flush) begin
        logic_pop_sync_popReg <= 7'h00;
      end
    end
  end

  always @(posedge clk) begin
    if(logic_pop_addressGen_ready) begin
      logic_pop_addressGen_rData <= logic_pop_addressGen_payload;
    end
  end


endmodule
