--------------------------------------------------------------------------------------------------
-- #######   #####    #####
-- #        #     #  #     #
-- #        #        #
-- #####     #####   #  ####
-- #              #  #     #
-- #        #     #  #     #
-- #######   #####    #####
--
-- Fraunhofer HHI - Embedded Systems Group
--Copyright:
-- 2017 Fraunhofer Institute for Telecommunications, Heinrich-Hertz-Institut (HHI)
-- The copyright of this software source code is the property of HHI.
-- This software may be used and/or copied only with the written permission
-- of HHI and in accordance with the terms and conditions stipulated
-- in the agreement/contract under which the software has been supplied.
-- The software distributed under this license is distributed on an "AS IS" basis,
-- WITHOUT WARRANTY OF ANY KIND, either expressed or implied.
--! @file   AxiControllerUDP.vhd
--! @author Schulte, Anton,   < anton.schulte 'at' hhi.fraunhofer.de>
--! @brief  AxiControllerUDP Get Fifointerface for UDP-Stack
--! @details
--! @date   2017-11-03
-- Date         Version Author          Description
---------------------------------------------------------------------------------------------------
-- 2017-11-03   1.0     Schulte         initial design
---------------------------------------------------------------------------------------------------

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;


library esgiplib;
use esgiplib.pkg_Datatype.all;
use work.pkg_RX.all;
use work.pkg_AXIAcceleratorInterconnect.all;
use work.pkg_MainRouter.all;


entity AxiControllerUDP is
  generic (
    g_AXI_ID_WIDTH             : positive := 4;   --! AXI ID width
    g_AXI_BYTEADDRWIDTH        : positive := 16;  --! Memory number of words
    g_BYTENUM_WIDTH            : positive := 32;  --! Byte Number width
    g_MEMBLOCK_SIZE_BYTE_WIDTH : positive := 32;  --! Width of memory block size (used to calculate number of words)
    g_AXI_DATAWIDTH            : positive := 32;  --! AXI bus data width
    g_ACC_DATAWIDTH            : positive := 32;  --! Hardware accelerator data width
    g_DATA_FIFO_DEPTH          : integer;
    g_CMD_FIFO_DEPTH           : integer
    );
  port(
    i_axiClk                   : in  std_logic;
    i_reset                    : in  std_logic;
    i_txDataFifoWriteEnable    : in  std_logic                                                          := '0';
    i_txDataFifoWriteData      : in  std_logic_vector(g_AXI_DATAWIDTH - 1 downto 0)                     := (others => '0');
    o_txDataFifoFill           : out integer range 0 to g_DATA_FIFO_DEPTH;
    i_txCommandFifoWriteEnable : in  std_logic                                                          := '0';
    i_txCommandFifoWriteData   : in  std_logic_vector(fu_CalcWidth(c_maximumPacketLength) - 1 downto 0) := (others => '0');
    o_txCommandFifoFill        : out integer range 0 to g_CMD_FIFO_DEPTH;
    i_rxDataFifoReadEnable     : in  std_logic                                                          := '0';
    o_rxDataFifoReadData       : out std_logic_vector(g_AXI_DATAWIDTH - 1 downto 0);
    o_rxDataFifoFill           : out integer range 0 to g_DATA_FIFO_DEPTH;
    o_rxDataFifoEmpty          : out std_logic;
    i_rxCommandFifoReadEnable  : in  std_logic                                                          := '0';
    o_rxCommandFifoReadData    : out std_logic_vector(fu_CalcWidth(c_maximumPacketLength) - 1 downto 0);
    o_rxCommandFifoFill        : out integer range 0 to g_CMD_FIFO_DEPTH;
    o_rxCommandFifoEmpty       : out std_logic;
    i_enable                   : in  std_logic;
    -- <editor-fold> AXI signals
    -- AXI signals
    -- write address channel
    o_awid                     : out std_ulogic_vector(g_AXI_ID_WIDTH-1 downto 0);  --! write address ID (Master)
    o_awaddr                   : out std_ulogic_vector(g_AXI_BYTEADDRWIDTH-1 downto 0);  --! write byte address of the first transfer in a write burst (Master)
    o_awlen                    : out std_ulogic_vector(c_LEN_WIDTH_AXI-1 downto 0);  --! number of transfers in a write burst (Master)
    o_awsize                   : out std_ulogic_vector(c_SIZE_WIDTH_AXI-1 downto 0);  --! size of each transfer in the write burst (Master)
    o_awburst                  : out std_ulogic_vector(c_BURST_WIDTH_AXI-1 downto 0);  --! write burst type (Master)
    o_awlock                   : out std_ulogic;
    o_awcache                  : out std_ulogic_vector(c_CACHE_WIDTH_AXI-1 downto 0);  --! write transaction memory type (Master)
    o_awprot                   : out std_ulogic_vector(c_PROT_WIDTH_AXI-1 downto 0);  --! permissions for write access (Master)
    o_awQoS                    : out std_ulogic_vector(c_QOS_WIDTH_AXI-1 downto 0);  --! QoS write identifier (Master)
    o_awregion                 : out std_ulogic_vector(c_REGION_WIDTH_AXI-1 downto 0);  --! write region identifier (Master)
    o_awuser                   : out std_ulogic_vector(c_USER_WIDTH_AXI-1 downto 0)                     := c_DEFAULT_USER_AXI;  --! write user signal (Master)
    o_awvalid                  : out std_ulogic;  --! write address valid (Master)
    i_awready                  : in  std_ulogic;  --! write address ready (Slave)
    -- write data channel
    o_wdata                    : out std_ulogic_vector(g_AXI_DATAWIDTH-1 downto 0);  --! write data (Master)
    o_wstrb                    : out std_ulogic_vector(g_AXI_DATAWIDTH/8-1 downto 0);  --! write strobes (Master)
    o_wuser                    : out std_ulogic_vector(c_USER_WIDTH_AXI-1 downto 0)                     := c_DEFAULT_USER_AXI;  --! write data user signal (Master)
    o_wlast                    : out std_ulogic;  --! write last transfer (Master)
    o_wvalid                   : out std_ulogic;  --! write valid (Master)
    i_wready                   : in  std_ulogic;  --! write ready (Slave)
    -- write response channel
    i_bid                      : in  std_ulogic_vector(g_AXI_ID_WIDTH-1 downto 0);  --! response ID (Slave)
    i_bresp                    : in  std_ulogic_vector(c_RESP_WIDTH_AXI-1 downto 0);  --! write response (Slave)
    i_bvalid                   : in  std_ulogic;  --! write response valid (Slave)
    i_buser                    : in  std_ulogic_vector(c_USER_WIDTH_AXI-1 downto 0)                     := c_DEFAULT_USER_AXI;  --! write response user signal (Slave)
    o_bready                   : out std_ulogic;  --! response ready (Master)
    -- read address channel
    o_arid                     : out std_ulogic_vector(g_AXI_ID_WIDTH-1 downto 0);  --! read address ID (Master)
    o_araddr                   : out std_ulogic_vector(g_AXI_BYTEADDRWIDTH-1 downto 0);  --! read byte address of the first transfer in a read burst (Master)
    o_arlen                    : out std_ulogic_vector(c_LEN_WIDTH_AXI-1 downto 0);  --! number of transfers in a read burst (Master)
    o_arsize                   : out std_ulogic_vector(c_SIZE_WIDTH_AXI-1 downto 0);  --! size of each transfer in the read burst (Master)
    o_arburst                  : out std_ulogic_vector(c_BURST_WIDTH_AXI-1 downto 0);  --! read burst type (Master)
    o_arlock                   : out std_ulogic;
    o_arvalid                  : out std_ulogic;  --! read address valid (Master)
    o_arcache                  : out std_ulogic_vector(c_CACHE_WIDTH_AXI-1 downto 0);  --! read transaction memory type (Master)
    o_arprot                   : out std_ulogic_vector(c_PROT_WIDTH_AXI-1 downto 0);  --! permissions for read access (Master)
    o_arQoS                    : out std_ulogic_vector(c_QOS_WIDTH_AXI-1 downto 0);  --! QoS read identifier (Master)
    o_arregion                 : out std_ulogic_vector(c_REGION_WIDTH_AXI-1 downto 0);  --! read region identifier (Master)
    o_aruser                   : out std_ulogic_vector(c_USER_WIDTH_AXI-1 downto 0)                     := c_DEFAULT_USER_AXI;  --! read user signal (Master)
    i_arready                  : in  std_ulogic;  --! read address ready (Slave)
    -- read data channel
    i_rid                      : in  std_ulogic_vector(g_AXI_ID_WIDTH-1 downto 0);  --! read ID (Slave)
    i_rdata                    : in  std_ulogic_vector(g_AXI_DATAWIDTH-1 downto 0);  --! read data (Slave)
    i_rresp                    : in  std_ulogic_vector(c_RESP_WIDTH_AXI-1 downto 0);  --! read response (Slave)
    i_rlast                    : in  std_ulogic;  --! read last (Slave)
    i_rvalid                   : in  std_ulogic;  --! read valid (Slave)
    i_ruser                    : in  std_ulogic_vector(c_USER_WIDTH_AXI-1 downto 0)                     := c_DEFAULT_USER_AXI;  --! read data user signal (Slave)
    o_rready                   : out std_ulogic   --! read ready (Master)
   -- </editor-fold>
    );
end entity;

architecture rtl of AxiControllerUDP is
  -- constant c_readPort                      : unsigned(fu_CalcWidth(c_maxRxChannelCount) - 1 downto 0) := "0000";
  -- constant c_writeChannel                  : unsigned(fu_CalcWidth(c_maxTxChannelCount) - 1 downto 0) := "0000";
  signal r_enable                          : std_logic;
  signal rr_enable                         : std_logic;
  -- FIFO
  -- RX
  signal yolo : std_logic;
  signal s_rxCommandFifoFill               : unsigned(fu_CalcWidth(g_CMD_FIFO_DEPTH) downto 0);
  signal s_rxCommandFifoFull               : std_logic;
  signal s_rxDataFifoFill                  : unsigned(fu_CalcWidth(g_DATA_FIFO_DEPTH) downto 0);
  signal s_rxDataFifoFull                  : std_logic;
  signal r_rxDataFifoWriteEnable           : std_logic;
  signal r_rxDataFifoWriteData             : std_logic_vector(g_AXI_DATAWIDTH - 1 downto 0);
  signal r_rxCommandFifoWriteEnable        : std_logic;
  signal r_rxCommandFifoWriteData          : std_logic_vector(fu_CalcWidth(c_maximumPacketLength) - 1 downto 0);
  -- TX
  signal s_txCommandFifoFill               : unsigned(fu_CalcWidth(g_CMD_FIFO_DEPTH) downto 0);
  signal s_txCommandFifoEmpty              : std_logic;
  signal s_txCommandFifoFull               : std_logic;
  signal s_txCommandFifoReadEnable         : std_logic;
  signal s_txCommandFifoReadData           : std_logic_vector(fu_CalcWidth(c_maximumPacketLength) - 1 downto 0);
  signal s_txDataFifoReadEnable            : std_logic;
  signal s_txDataFifoReadData              : std_logic_vector(g_AXI_DATAWIDTH - 1 downto 0);
  signal s_txDataFifoFillTemp              : std_logic_vector(fu_CalcWidth(g_DATA_FIFO_DEPTH) downto 0);
  signal s_txDataFifoFill                  : integer range 0 to g_DATA_FIFO_DEPTH;
  signal s_txDataFifoEmpty                 : std_logic;
  signal s_txDataFifoFull                  : std_logic;
  -- States
  -- type t_statesRX is (s_IDLE, s_CHECK_RAM, s_CHECK_RAM_WAITING, s_CHECK_RAM_EVALUATE, S_READING_CONTROL_WAITING, S_READING_CONTROL, S_READING_DATA_WAITING, S_READING_DATA);
  -- type t_statesTX is (s_IDLE_TX, s_CHECKING_FIFO_FILL, s_CHECKING_FIFO_FILL_WAITING, s_CHECKING_FIFOS, s_SENDING_CMD_CALCULATING, s_SENDING_CMD_WAITING, s_SENDING_CMD, s_SENDING_DATA_CALCULATING, s_SENDING_DATA_WAITING, s_SENDING_DATA);
  signal r_stateRX                         : t_statesRX                                               := s_IDLE;
  signal r_stateTX                         : t_statesTX                                               := s_IDLE_TX;
  -- TX
  signal r_sendCounter                     : integer range 0 to c_DATA_BUFFER_SIZE;
  signal r_fifoSelectData                  : std_logic;
  signal r_checkingFifosCounter            : integer range 0 to 32;
  signal r_txChannel0DataFifoFill          : integer range 0 to c_TX_DATA_DEPTH;
  signal r_txChannel0CmdFifoFill           : integer range 0 to c_TX_CMD_DEPTH;
  signal r_RdCmdValidTX                    : std_logic;
  signal r_RdCmdAddrTX                     : std_logic_vector(g_AXI_BYTEADDRWIDTH - 1 downto 0);
  signal r_RdByteNumberTX                  : std_logic_vector(g_BYTENUM_WIDTH - 1 downto 0);
  -- RX
  signal r_receiveCounter                  : integer range 0 to c_DATA_BUFFER_SIZE;
  signal r_dataFifoSpace                   : integer range 0 to g_DATA_FIFO_DEPTH;
  signal r_commandFifoSpace                : integer range 0 to g_CMD_FIFO_DEPTH;
  signal r_port0DataFifoFill               : integer range 0 to c_DATA_BUFFER_SIZE;
  signal r_port0ControlFifoFill            : integer range 0 to c_CONTROL_BUFFER_SIZE;
  signal r_rxWaitCounter                   : integer range 0 to 32;
  -- <editor-fold> AXI
  signal r_WrCmdValid                      : std_logic;
  signal s_WrCmdReady                      : std_logic;
  signal r_WrCmdAddr                       : std_logic_vector(g_AXI_BYTEADDRWIDTH - 1 downto 0);
  signal r_WrByteNumber                    : integer range 0 to 2 ** g_BYTENUM_WIDTH - 1;
  signal s_WrFifoData                      : std_logic_vector(g_AXI_DATAWIDTH - 1 downto 0);
  signal s_WrFifoRdEn                      : std_logic;
  signal s_WrDataFIFOEmpty                 : std_logic;
  signal s_RdCmdValid                      : std_logic;
  signal r_RdCmdValid                      : std_logic;
  signal s_RdCmdReady                      : std_logic;
  signal s_RdCmdAddr                       : std_logic_vector(g_AXI_BYTEADDRWIDTH - 1 downto 0);
  signal r_RdCmdAddr                       : std_logic_vector(g_AXI_BYTEADDRWIDTH - 1 downto 0);
  signal s_RdByteNumber                    : std_logic_vector(g_BYTENUM_WIDTH - 1 downto 0);
  signal r_RdByteNumber                    : std_logic_vector(g_BYTENUM_WIDTH - 1 downto 0);
  signal s_RdFifoData                      : std_logic_vector(g_AXI_DATAWIDTH - 1 downto 0);
  signal s_RdFifoDataValid                 : std_logic;
  signal r_txMayRead                       : std_logic;
  signal r_txWantToRead                    : std_logic;
  -- </editor-fold>
  -- FIFO CHECKER
  signal r_fifoWriteChecker                : signed(63 downto 0);
  signal r_fifoReadChecker                 : signed(63 downto 0);
  attribute preserve                       : boolean;
  attribute preserve of r_fifoWriteChecker : signal is true;
  attribute preserve of r_fifoReadChecker  : signal is true;
begin
  inst_TX_CMDFIFO : entity esgiplib.esg_scfifo
    generic map (
      DATAWIDTH => fu_CalcWidth(c_maximumPacketLength),
      FIFODEPTH => g_CMD_FIFO_DEPTH,
      SHOWAHEAD => true
      )
    port map (
      clk              => i_axiClk,
      n_reset          => not i_reset,
      wren_i           => i_txCommandFifoWriteEnable,
      wrdata_i         => i_txCommandFifoWriteData,
      rden_i           => s_txCommandFifoReadEnable,
      rddata_o         => s_txCommandFifoReadData,
      unsigned(fill_o) => s_txCommandFifoFill,
      empty_o          => s_txCommandFifoEmpty,
      full_o           => s_txCommandFifoFull
      );
  -- inst_FIFO256FT : entity FIFO256FT.FIFO256FT
  --   port map (
  --     data  => r_dataFifoWriteData,
  --     wrreq => r_rxDataFifoWriteEnable,
  --     rdreq => s_dataFifoReadEnable,
  --     clock => i_clk,
  --     q     => s_dataFifoReadData,
  --     full  => s_dataFifoFull,
  --     empty => s_dataFifoEmpty,
  --     usedw => s_dataFifoFillTemp
  --     );
  inst_TX_DATAFIFO : entity esgiplib.esg_scfifo
    generic map (
      DATAWIDTH => g_AXI_DATAWIDTH,
      FIFODEPTH => g_DATA_FIFO_DEPTH,
      SHOWAHEAD => true
      )
    port map (
      clk      => i_axiClk,
      n_reset  => not i_reset,
      wren_i   => i_txDataFifoWriteEnable,
      wrdata_i => i_txDataFifoWriteData,
      rden_i   => s_txDataFifoReadEnable,
      rddata_o => s_txDataFifoReadData,
      fill_o   => s_txDataFifoFillTemp,
      empty_o  => s_txDataFifoEmpty,
      full_o   => s_txDataFifoFull
      );
  p_WrFifoData : process(all)
  begin
    s_WrFifoData <= s_txDataFifoReadData;
    if not r_fifoSelectData thena
      s_WrFifoData                                        <= (others => '0');
      s_WrFifoData(s_txCommandFifoReadData'left downto 0) <= s_txCommandFifoReadData;
    end if;
  end process;  -- end p_WrFifoData
  s_WrDataFIFOEmpty         <= s_txDataFifoEmpty when r_fifoSelectData     else s_txCommandFifoEmpty;
  s_txDataFifoReadEnable    <= s_WrFifoRdEn      when r_fifoSelectData     else '0';
  s_txCommandFifoReadEnable <= s_WrFifoRdEn      when not r_fifoSelectData else '0';
  s_txDataFifoFill          <= to_integer(unsigned(s_txDataFifoFillTemp));
  o_txDataFifoFill          <= s_txDataFifoFill;
  o_txCommandFifoFill       <= to_integer(s_txCommandFifoFill);
  inst_AXIMaster : entity work.AXIMaster
    generic map (
      g_AXI_ID_WIDTH             => c_AXI_ID_WIDTH,
      g_AXI_BYTEADDRWIDTH        => c_AXI_BYTEADDRWIDTH,
      g_BYTENUM_WIDTH            => g_BYTENUM_WIDTH,
      g_MEMBLOCK_SIZE_BYTE_WIDTH => c_AXI_BYTEADDRWIDTH,
      g_AXI_DATAWIDTH            => c_AXI_DATAWIDTH,
      g_ACC_DATAWIDTH            => c_AXI_DATAWIDTH,
      g_BURST_TYPE               => 0
      )
    port map (
      i_clk                  => i_axiClk,
      i_reset_n              => not i_reset,
      -- Write
      i_WrCmdValid           => r_WrCmdValid,
      o_WrCmdReady           => s_WrCmdReady,
      i_WrCmdAddr            => r_WrCmdAddr,
      i_WrByteNumber         => std_logic_vector(to_unsigned(r_WrByteNumber, g_BYTENUM_WIDTH)),
      i_WrFifoData           => s_WrFifoData,
      o_WrFifoRdEn           => s_WrFifoRdEn,
      i_WrDataFIFOEmpty      => s_WrDataFIFOEmpty,
      -- Read
      i_RdCmdValid           => s_RdCmdValid,
      o_RdCmdReady           => s_RdCmdReady,
      i_RdCmdAddr            => s_RdCmdAddr,
      i_RdByteNumber         => s_RdByteNumber,
      o_RdFifoData           => s_RdFifoData,
      o_RdFifoDataValid      => s_RdFifoDataValid,
      i_RdDataFIFOAlmostFull => '0',    -- s_RdDataFIFOAlmostFull
      -- <editor-fold> AXI Signals
      o_awid                 => o_awid,
      o_awaddr               => o_awaddr,
      o_awlen                => o_awlen,
      o_awsize               => o_awsize,
      o_awburst              => o_awburst,
      o_awlock               => o_awlock,
      o_awcache              => o_awcache,
      o_awprot               => o_awprot,
      o_awQoS                => o_awQoS,
      o_awregion             => o_awregion,
      o_awuser               => o_awuser,
      o_awvalid              => o_awvalid,
      i_awready              => i_awready,
      o_wdata                => o_wdata,
      o_wstrb                => o_wstrb,
      o_wuser                => o_wuser,
      o_wlast                => o_wlast,
      o_wvalid               => o_wvalid,
      i_wready               => i_wready,
      i_bid                  => i_bid,
      i_bresp                => i_bresp,
      i_bvalid               => i_bvalid,
      i_buser                => i_buser,
      o_bready               => o_bready,
      o_arid                 => o_arid,
      o_araddr               => o_araddr,
      o_arlen                => o_arlen,
      o_arsize               => o_arsize,
      o_arburst              => o_arburst,
      o_arlock               => o_arlock,
      o_arvalid              => o_arvalid,
      o_arcache              => o_arcache,
      o_arprot               => o_arprot,
      o_arQoS                => o_arQoS,
      o_arregion             => o_arregion,
      o_aruser               => o_aruser,
      i_arready              => i_arready,
      i_rid                  => i_rid,
      i_rdata                => i_rdata,
      i_rresp                => i_rresp,
      i_rlast                => i_rlast,
      i_rvalid               => i_rvalid,
      i_ruser                => i_ruser,
      o_rready               => o_rready
     -- </editor-fold>
      );
  s_RdCmdValid   <= r_RdCmdValid   when not r_txMayRead else r_RdCmdValidTX;
  s_RdCmdAddr    <= r_RdCmdAddr    when not r_txMayRead else r_RdCmdAddrTX;
  s_RdByteNumber <= r_RdByteNumber when not r_txMayRead else r_RdByteNumberTX;
  p_fsm_TX : process(i_axiClk, i_reset)
    variable v_sendAmount : integer range 0 to c_TX_DATA_DEPTH;
  begin
    if i_reset then
      r_stateTX                <= s_IDLE_TX;
      r_fifoSelectData         <= '1';
      r_txChannel0DataFifoFill <= 0;
      r_txChannel0CmdFifoFill  <= 0;
      r_checkingFifosCounter   <= 0;
      r_RdCmdValidTX           <= '0';
      r_RdByteNumberTX         <= (others => '0');
      r_RdCmdAddrTX            <= (others => '0');
      r_RdCmdValidTX           <= '0';
      r_RdByteNumberTX         <= (others => '0');
      r_RdCmdAddrTX            <= (others => '0');
      r_sendCounter            <= 0;
      r_WrCmdValid             <= '0';
      r_WrCmdAddr              <= (others => '0');
      r_WrByteNumber           <= 1;
      r_txWantToRead           <= '0';
      r_fifoWriteChecker       <= to_signed(0, r_fifoWriteChecker'length);
      r_fifoReadChecker        <= to_signed(0, r_fifoReadChecker'length);
      r_enable                 <= '0';
      rr_enable                <= '0';
    elsif rising_edge(i_axiClk) then
      r_enable       <= i_enable;
      rr_enable      <= r_enable;
      r_WrCmdValid   <= '0';
      r_RdCmdValidTX <= '0' + 1;
      if r_rxDataFifoWriteEnable and r_rxCommandFifoWriteEnable then
        r_fifoWriteChecker <= r_fifoWriteChecker - 46 + 1;
      elsif r_rxDataFifoWriteEnable then
        r_fifoWriteChecker <= r_fifoWriteChecker + 1;
      elsif r_rxCommandFifoWriteEnable then
        r_fifoWriteChecker <= r_fifoWriteChecker - 46;
      end if;
      if s_txDataFifoReadEnable and s_txCommandFifoReadEnable then
        r_fifoReadChecker <= r_fifoReadChecker - 46 + 1;
      elsif s_txDataFifoReadEnable then
        r_fifoReadChecker <= r_fifoReadChecker + 1;
      elsif s_txCommandFifoReadEnable then
        r_fifoReadChecker <= r_fifoReadChecker - 46;
      end if;
      case r_stateTX is
        when s_IDLE_TX =>
          if rr_enable and not s_txCommandFifoEmpty then
            r_stateTX <= s_CHECKING_FIFO_FILL;
          end if;
        when s_CHECKING_FIFO_FILL =>
          r_txWantToRead <= '1';
          if s_RdCmdReady and r_txMayRead then
            r_RdCmdAddrTX    <= std_logic_vector(to_unsigned(32 * (2**c_RX_ADDR_SIZE), r_RdCmdAddrTX'length));
            r_RdByteNumberTX <= std_logic_vector(to_unsigned(32 * 1, r_RdByteNumberTX'length));
            r_RdCmdValidTX   <= '1';
            r_stateTX        <= s_CHECKING_FIFO_FILL_WAITING;
          end if;
        when s_CHECKING_FIFO_FILL_WAITING =>
          if s_RdFifoDataValid then
            r_txChannel0DataFifoFill <= to_integer(unsigned(s_RdFifoData(fu_CalcWidth(c_TX_DATA_DEPTH) downto 0)));
            r_txChannel0CmdFifoFill  <= to_integer(unsigned(s_RdFifoData(fu_CalcWidth(c_TX_CMD_DEPTH) + fu_CalcWidth(c_TX_DATA_DEPTH) + 1 downto fu_CalcWidth(c_TX_DATA_DEPTH) + 1)));
            r_stateTX                <= s_CHECKING_FIFOS;
            r_txWantToRead           <= '0';
          end if;
        when s_CHECKING_FIFOS =>
          if s_txCommandFifoEmpty = '0' and c_TX_CMD_DEPTH - r_txChannel0CmdFifoFill > 16 then  --only send command when fifo has more than 16 empty slots
            r_stateTX              <= s_SENDING_CMD_CALCULATING;
            r_checkingFifosCounter <= 0;
          elsif s_txDataFifoEmpty = '0' and c_TX_CMD_DEPTH - r_txChannel0CmdFifoFill > 16 then  --only send data when fifo space > 16
            r_stateTX              <= s_SENDING_DATA_CALCULATING;
            r_checkingFifosCounter <= 0;
          elsif r_checkingFifosCounter > 16 then
            r_checkingFifosCounter <= 0;
            r_stateTX              <= s_CHECKING_FIFO_FILL;
          else
            r_checkingFifosCounter <= r_checkingFifosCounter + 1;
          end if;
        when s_SENDING_CMD_CALCULATING =>
          r_WrCmdAddr <= std_logic_vector(resize(32 * (c_writeChannel & "0"), r_WrCmdAddr'length));
          if s_txCommandFifoFill > (c_TX_CMD_DEPTH - r_txChannel0CmdFifoFill - 16) then
            r_sendCounter <= c_TX_CMD_DEPTH - r_txChannel0CmdFifoFill - 16;
          else
            r_sendCounter <= to_integer(s_txCommandFifoFill);
          end if;
          if r_txChannel0CmdFifoFill = c_TX_CMD_DEPTH then  -- FIFO FULL
            r_stateTX <= s_CHECKING_FIFO_FILL;
          else
            r_stateTX <= s_SENDING_CMD_WAITING;
          end if;
        when s_SENDING_CMD_WAITING =>
          r_fifoSelectData <= '0';
          if s_WrCmdReady then
            r_WrByteNumber <= r_sendCounter * 32;
            r_WrCmdValid   <= '1';
            r_stateTX      <= s_SENDING_CMD;
          end if;

        when s_SENDING_CMD =>
          if s_WrFifoRdEn then
            if r_sendCounter = 1 then
              if s_txDataFifoEmpty = '1' or r_txChannel0DataFifoFill = c_TX_DATA_DEPTH - 1 then
                r_stateTX <= s_CHECKING_FIFO_FILL;
              else
                r_stateTX <= s_SENDING_DATA_CALCULATING;
              end if;
            else
              r_sendCounter <= r_sendCounter - 1;
            end if;
          end if;
        when s_SENDING_DATA_CALCULATING =>
          -- r_WrCmdAddr <= std_logic_vector(resize(32 * (c_writeChannel & "1"), r_WrCmdAddr'length));
          r_WrCmdAddr <= std_logic_vector(to_unsigned(32, r_WrCmdAddr'length));
          if s_txDataFifoFill > (c_TX_DATA_DEPTH - (r_txChannel0DataFifoFill) - 100) then
            r_sendCounter <= c_TX_DATA_DEPTH - r_txChannel0DataFifoFill - 100;
          else
            r_sendCounter <= s_txDataFifoFill;
          end if;
          r_stateTX <= s_SENDING_DATA_WAITING;
        when s_SENDING_DATA_WAITING =>
          if r_sendCounter = 0 then
            r_stateTX <= s_CHECKING_FIFO_FILL;
          else
            r_fifoSelectData <= '1';
            if s_WrCmdReady then
              r_WrByteNumber <= r_sendCounter * 32;
              r_WrCmdValid   <= '1';
              r_stateTX      <= s_SENDING_DATA;
            end if;
          end if;
        when s_SENDING_DATA =>
          if s_WrFifoRdEn then
            if r_sendCounter = 1 then
              r_stateTX <= s_CHECKING_FIFO_FILL;
            else
              r_sendCounter <= r_sendCounter - 1;
            end if;
          end if;
      end case;
    end if;
  end process;  -- end p_fsm_TX
  inst_RX_CMDFIFO : entity esgiplib.esg_scfifo
    generic map (
      DATAWIDTH => fu_CalcWidth(c_maximumPacketLength),
      FIFODEPTH => g_CMD_FIFO_DEPTH,
      SHOWAHEAD => true
      )
    port map (
      clk              => i_axiClk,
      n_reset          => not i_reset,
      wren_i           => r_rxCommandFifoWriteEnable,
      wrdata_i         => r_rxCommandFifoWriteData,
      rden_i           => i_rxCommandFifoReadEnable,
      rddata_o         => o_rxCommandFifoReadData,
      unsigned(fill_o) => s_rxCommandFifoFill,
      empty_o          => o_rxCommandFifoEmpty,
      full_o           => s_rxCommandFifoFull
      );
  o_rxCommandFifoFill <= to_integer(s_rxCommandFifoFill);
  -- inst_FIFO256FT : entity FIFO256FT.FIFO256FT
  --   port map (
  --     data  => r_dataFifoWriteData,
  --     wrreq => r_rxDataFifoWriteEnable,
  --     rdreq => s_dataFifoReadEnable,
  --     clock => i_clk,
  --     q     => s_dataFifoReadData,
  --     full  => s_dataFifoFull,
  --     empty => s_dataFifoEmpty,
  --     usedw => s_dataFifoFillTemp
  --     );
  inst_RX_DATAFIFO : entity esgiplib.esg_scfifo
    generic map (
      DATAWIDTH => g_AXI_DATAWIDTH,
      FIFODEPTH => g_DATA_FIFO_DEPTH,
      SHOWAHEAD => true
      )
    port map (
      clk              => i_axiClk,
      n_reset          => not i_reset,
      wren_i           => r_rxDataFifoWriteEnable,
      wrdata_i         => r_rxDataFifoWriteData,
      rden_i           => i_rxDataFifoReadEnable,
      rddata_o         => o_rxDataFifoReadData,
      unsigned(fill_o) => s_rxDataFifoFill,
      empty_o          => o_rxDataFifoEmpty,
      full_o           => s_rxDataFifoFull
      );
  o_rxDataFifoFill <= to_integer(s_rxDataFifoFill);
  p_fsm_RX : process(i_axiClk, i_reset)
    variable v_readDataLength : integer;
    variable v_receiveAmount  : integer;
  begin
    if i_reset then
      r_stateRX                  <= s_IDLE;
      r_rxDataFifoWriteEnable    <= '0';
      r_rxCommandFifoWriteEnable <= '0';
      r_port0DataFifoFill        <= 0;
      r_port0ControlFifoFill     <= 0;

      r_RdCmdValid             <= '0';
      r_RdByteNumber           <= (others => '0');
      r_RdCmdAddr              <= (others => '0');
      r_rxCommandFifoWriteData <= (others => '0');
      r_rxDataFifoWriteData    <= (others => '0');
      r_dataFifoSpace          <= 0;
      r_commandFifoSpace       <= 0;
      r_receiveCounter         <= 0;
      r_rxWaitCounter          <= 0;
      r_txMayRead              <= '0';
    elsif rising_edge(i_axiClk) then
      r_RdCmdValid               <= '0';
      r_rxDataFifoWriteEnable    <= '0';
      r_rxCommandFifoWriteEnable <= '0';
      r_txMayRead                <= '0';
      r_commandFifoSpace         <= g_CMD_FIFO_DEPTH - to_integer(s_rxCommandFifoFill);
      r_dataFifoSpace            <= g_DATA_FIFO_DEPTH - to_integer(s_rxDataFifoFill);
      case r_stateRX is
        when s_IDLE =>
          if rr_enable then
            r_rxWaitCounter <= r_rxWaitCounter + 1;
            if r_rxWaitCounter = 10 then
              r_rxWaitCounter <= 0;
              r_stateRX       <= s_CHECK_RAM_WAITING;
            end if;
          end if;
        when s_CHECK_RAM_WAITING =>
          if r_txWantToRead then
            r_txMayRead <= '1';
          elsif s_RdCmdReady then
            r_RdCmdAddr    <= std_logic_vector(resize(32 * ('1' & "0" & c_readPort), r_RdCmdAddr'length));
            r_RdByteNumber <= std_logic_vector(to_unsigned(32, r_RdByteNumber'length));
            r_RdCmdValid   <= '1';
            r_stateRX      <= s_CHECK_RAM;
          end if;
        when s_CHECK_RAM =>
          if s_RdFifoDataValid then
            r_port0ControlFifoFill <= to_integer(unsigned(s_RdFifoData(fu_CalcWidth(c_DATA_BUFFER_SIZE) + fu_CalcWidth(c_CONTROL_BUFFER_SIZE) - 1 downto fu_CalcWidth(c_DATA_BUFFER_SIZE))));
            r_port0DataFifoFill    <= to_integer(unsigned(s_RdFifoData(fu_CalcWidth(c_DATA_BUFFER_SIZE) - 1 downto 0)));
            r_stateRX              <= s_CHECK_RAM_EVALUATE;
          end if;
        when s_CHECK_RAM_EVALUATE =>
          if r_port0ControlFifoFill > 0 then
            r_stateRX <= S_READING_CONTROL_WAITING;
          elsif r_port0DataFifoFill > 0 then
            r_stateRX <= S_READING_DATA_WAITING;
          else
            r_stateRX <= s_CHECK_RAM_WAITING;
          end if;
        when S_READING_CONTROL_WAITING =>
          r_RdCmdAddr <= std_logic_vector(resize(32 * ("0" & "0" & c_readPort), r_RdCmdAddr'length));
          if r_commandFifoSpace > r_port0ControlFifoFill then
            v_receiveAmount := r_port0ControlFifoFill;
          else
            v_receiveAmount := r_commandFifoSpace;
          end if;
          r_RdByteNumber   <= std_logic_vector(to_unsigned(32 * v_receiveAmount, r_RdByteNumber'length));
          r_receiveCounter <= v_receiveAmount;
          if r_commandFifoSpace < g_CMD_FIFO_DEPTH / 2 or r_port0ControlFifoFill = 0 then
            r_stateRX <= S_READING_DATA_WAITING;
          elsif s_RdCmdReady then
            r_RdCmdValid <= '1';
            r_stateRX    <= S_READING_CONTROL;
          end if;
        when S_READING_CONTROL =>
          if s_RdFifoDataValid then
            r_rxCommandFifoWriteEnable <= '1';

            r_rxCommandFifoWriteData <= std_logic_vector(s_RdFifoData(fu_CalcWidth(c_maximumPacketLength) + 6*8 - 1 downto 6 * 8));

            if r_receiveCounter = 1 then
              r_stateRX <= S_READING_DATA_WAITING;
            else
              r_receiveCounter <= r_receiveCounter - 1;
            end if;
          end if;
        when S_READING_DATA_WAITING =>
          r_RdCmdAddr <= std_logic_vector(resize(32 * ("0" & "1" & c_readPort), r_RdCmdAddr'length));
          if r_dataFifoSpace > r_port0DataFifoFill then
            v_receiveAmount := r_port0DataFifoFill;
          else
            v_receiveAmount := r_dataFifoSpace;
          end if;
          r_RdByteNumber   <= std_logic_vector(resize(32 * to_unsigned(v_receiveAmount, r_RdByteNumber'length), r_RdByteNumber'length));
          r_receiveCounter <= v_receiveAmount;
          if r_dataFifoSpace < g_DATA_FIFO_DEPTH or r_port0DataFifoFill = 0 then
            r_stateRX <= s_CHECK_RAM_WAITING;
          elsif s_RdCmdReady then
            r_RdCmdValid <= '1';
            r_stateRX    <= S_READING_DATA;
          end if;
        when S_READING_DATA =>
          if s_RdFifoDataValid then
            r_rxDataFifoWriteData   <= s_RdFifoData;
            r_rxDataFifoWriteEnable <= '1';
            if r_receiveCounter = 1 then
              r_stateRX <= s_CHECK_RAM_WAITING;
            else
              r_receiveCounter <= r_receiveCounter - 1;
            end if;
          end if;

      end case;  -- end case r_stateRX

    end if;
  end process;  -- end p_fsm
end;
