library ieee;
use ieee.std_logic_1164.all;
entity matching_case_no_end_q is
end entity;
architecture arch of matching_case_no_end_q is
  constant i_addr_v : std_ulogic_vector(11 downto 0) := (others => '0');
begin
  process is

  begin
    sel_reg : case? i_addr_v(11 downto 6) is
      when "00----" => null;
      when others   => null;
    end case sel_reg;
  end process;
end architecture;
