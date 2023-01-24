entity test_nested_elsif is
end test_nested_elsif;
architecture arch of test_nested_elsif is


begin

  gen_inner     : if d_label : true generate
  -- end; -- optional end at the end of generate_statement_body

  end generate;


end arch;
