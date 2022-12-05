entity test_exit is
end test_exit;

architecture arch of test_exit is

begin
  a_p : process

  begin
    a : for i_unused in 0 to 10 loop
      exit a;
    end loop;
  end process;

end architecture;
