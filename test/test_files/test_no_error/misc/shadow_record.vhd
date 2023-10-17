library ieee;
use ieee.std_logic_1164.std_ulogic_vector;
package shadow_record is
  constant IP_LENGTH : integer := 4*8;

  type t_packet is record
    ip_source : std_ulogic_vector(IP_LENGTH - 1 downto 0);
    ip_length : std_ulogic_vector(15 downto 0);

  end record t_packet;

end package;
