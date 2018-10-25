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
use work.DEMO_PACK.all;
-------------------------------------------------

entity Mux is
port(	I3: 	 in std_logic_vector(2 downto 0);
	I2: 	in std_logic_vector(2 downto 0);
	I1: 	in std_logic_vector(2 downto 0);
	I0: 	in std_logic_vector(2 downto 0);
	S:	 in std_logic_vector(1 downto 0);
	O:	out std_logic_vector(2 downto 0);
	o_test: out std_logic
);
end Mux;

-------------------------------------------------

architecture behv1 of Mux is
  signal s_test : std_logic_vector(10 downto 0);
begin
	o_test <= s_test;
    process (I3,I2,I1,I0,S)
    begin
      for i in 50 to 10 loop
        s_test <= PARITY(SOME_FLAG);
      end loop;
        -- use case statement
      case S is
	    when "00" =>
      hase: if I2 = "010" then
        O <= I0;
      else
      end if hase;
	    when "01" =>	O <= I1;
	    when "10" =>	O <= I2;
	    when "11" =>	O <= I3;
	    when others =>	O <=  "ZZZ";
	end case;

    end process;

end behv1;

-----------------------------
