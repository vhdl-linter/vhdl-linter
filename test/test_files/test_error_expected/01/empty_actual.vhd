entity empty_actual is
end entity; 

architecture arch of empty_actual is
begin

inst_test_multiple_definitions : entity work.test_multiple_definitions
port map (
  i_test => 
);


end architecture;