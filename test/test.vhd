-------------------------------------------------
-- VHDL code for 4:1 multiplexor
-- (ESD book figure 2.5)
-- by Weijun Zhang, 04/2001
--
-- Multiplexor is a device to select different
-- inputs to outputs. we use 3 bits vector to
-- describe its I/O ports
-------------------------------------------------

library ieee;
use ieee.std_logic_1164.all;

-------------------------------------------------

entity Mux is
  port(I3 : in  std_logic_vector(2 downto 0);
       I2 : in  std_logic_vector(2 downto 0);
       I1 : in  std_logic_vector(2 downto 0);
       I0 : in  std_logic_vector(2 downto 0);
       S  : in  std_logic_vector(1 downto 0);
       O  : out std_logic_vector(2 downto 0)
       );
end Mux;

-------------------------------------------------

architecture behv1 of Mux is
  signal s_test : std_logic_vector(10 downto 0);
  type t_statesTX is (s_IDLE_TX, s_SENDING);

begin


  process (I3, I2, I1, I0, S)
  begin
    for v_i in 0 to c_AXI_DATAWIDTH/g_BYTENUM_LENGTH - 1 loop
      if std_logic_vector(r_consecutiveReceiveByteCounter + v_i) /= s_rxDataFifoReadData(s_rxDataFifoReadData'left - g_BYTENUM_LENGTH * v_i downto s_rxDataFifoReadData'left - g_BYTENUM_LENGTH * (v_i + 1) + 1) then
        r_byteError <= '1';
        yolo        <= s_IDLE_TX;
      -- report "byte error" & to_hex_string(r_consecutiveReceiveByteCounter + v_i) severity failure;
      end if;
    end loop;  -- end for

  end process;
end behv1;

-----------------------------
